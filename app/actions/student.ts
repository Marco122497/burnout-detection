"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { toAuditLogRow } from "@/lib/audit";
import { requireRole, requireUser } from "@/lib/auth/session";
import {
  finalizeWeeklyMonitoring,
} from "@/lib/student/finalize-monitoring";
import { getWeeklyMonitoringSections } from "@/lib/student/questionnaires";
import {
  computeSectionScores,
  validateAllAnswers,
  type AnswerMap,
} from "@/lib/student/scoring";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import {
  resolveStudentResearchConsent,
  RESEARCH_CONSENT_VERSION,
} from "@/lib/student/research-consent";

export type StudentActionState = {
  error?: string;
  success?: string;
};

async function getRequestIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null
  );
}

export async function submitWeeklyMonitoring(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    return await submitWeeklyMonitoringInner(_prev, formData);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("submitWeeklyMonitoring:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit weekly monitoring. Please try again.",
    };
  }
}

async function submitWeeklyMonitoringInner(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const { supabase, user, profile } = await requireRole(["Student"]);

  if (
    !(
      await resolveStudentResearchConsent(
        supabase,
        user.id,
        profile.research_consent_status,
        profile.research_consent_version
      )
    ).hasAgreed
  ) {
    return {
      error:
        "Please complete the informed consent form before submitting weekly monitoring.",
    };
  }

  const remarks = String(formData.get("remarks") || "").trim() || null;
  const weekRaw = String(formData.get("week_number") || "").trim();

  const [sections, term] = await Promise.all([
    getWeeklyMonitoringSections(supabase),
    getActiveTerm(supabase),
  ]);

  if (sections.some((section) => section.questions.length === 0)) {
    return {
      error:
        "Questionnaires are not configured yet. Ask the Guidance Office to activate Phase 2 questions.",
    };
  }

  const answers: AnswerMap = {};
  for (const section of sections) {
    for (const question of section.questions) {
      const raw = String(formData.get(`q_${question.question_id}`) || "").trim();
      if (!raw) continue;
      answers[question.question_id] = Number(raw);
    }
  }

  const validationError = validateAllAnswers(sections, answers);
  if (validationError) {
    return { error: validationError };
  }

  let scores;
  try {
    scores = computeSectionScores(sections, answers);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to score responses.",
    };
  }

  if (!term) {
    return { error: "No active academic term is configured." };
  }

  if (!term.monitoring_enabled) {
    return {
      error:
        "Weekly monitoring is not open yet. Wait for the Guidance Office to open this week's form.",
    };
  }

  const week_number = weekRaw ? Number(weekRaw) : getCurrentWeekNumber(term);
  if (
    Number.isNaN(week_number) ||
    week_number < 1 ||
    week_number !== getCurrentWeekNumber(term)
  ) {
    return { error: "Invalid week number for the open monitoring window." };
  }

  const { data: existing } = await supabase
    .from("weekly_monitoring")
    .select("monitoring_id")
    .eq("student_id", user.id)
    .eq("term_id", term.term_id)
    .eq("week_number", week_number)
    .maybeSingle();

  // Interrupted submit (reload / network drop): resume scoring + AI instead of blocking.
  if (existing?.monitoring_id) {
    const finalized = await finalizeWeeklyMonitoring(supabase, {
      studentId: user.id,
      profile,
      monitoringId: existing.monitoring_id,
    });

    revalidatePath("/student");
    revalidatePath("/student/monitoring");
    revalidatePath("/student/burnout");
    revalidatePath("/student/recommendations");
    revalidatePath("/student/notifications");
    revalidatePath("/instructor");
    revalidatePath("/instructor/notifications");
    revalidatePath("/instructor/monitoring");

    if (!finalized.complete) {
      return { error: finalized.message };
    }

    return {
      success: finalized.resumed
        ? finalized.message
        : `Week ${week_number} was already submitted. MFBI ${Number(finalized.mfbiScore).toFixed(2)} (${finalized.burnoutLevel}). Prediction: ${finalized.prediction}.`,
    };
  }

  const submittedAt = new Date().toISOString();

  const { data: monitoring, error: monitoringError } = await supabase
    .from("weekly_monitoring")
    .insert({
      student_id: user.id,
      term_id: term.term_id,
      week_number,
      stress_score: scores.stress_score,
      academic_workload_score: scores.academic_workload_score,
      study_time_score: scores.study_time_score,
      sleep_hours_score: scores.sleep_hours_score,
      status: "Submitted",
      submitted_at: submittedAt,
      remarks,
    })
    .select("monitoring_id")
    .single();

  if (monitoringError || !monitoring) {
    return {
      error: monitoringError?.message || "Failed to save weekly monitoring.",
    };
  }

  const answerRows = Object.entries(answers).map(([questionId, answer_value]) => ({
    monitoring_id: monitoring.monitoring_id,
    question_id: Number(questionId),
    answer_value,
  }));

  const { error: answersError } = await supabase
    .from("weekly_monitoring_answers")
    .insert(answerRows);

  if (answersError) {
    await supabase
      .from("weekly_monitoring")
      .delete()
      .eq("monitoring_id", monitoring.monitoring_id);
    return { error: `Failed to save answers: ${answersError.message}` };
  }

  // Scores + answers are durable from here. Finalize MFBI / AI / alerts
  // (also used to recover if this request is interrupted mid-AI).
  const finalized = await finalizeWeeklyMonitoring(supabase, {
    studentId: user.id,
    profile,
    monitoringId: monitoring.monitoring_id,
  });

  if (!finalized.complete) {
    revalidatePath("/student");
    revalidatePath("/student/monitoring");
    return {
      error: `${finalized.message} Your answers were saved — reopen this page or submit again to finish processing.`,
    };
  }

  const ip = await getRequestIp();
  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "SUBMIT_WEEKLY_MONITORING",
      action_type: "CREATE",
      table_name: "weekly_monitoring",
      record_id: monitoring.monitoring_id,
      description: `Week ${week_number} MFBI ${finalized.mfbiScore} (${finalized.burnoutLevel}); prediction ${finalized.prediction}`,
      ip_address: ip,
    })
  );

  revalidatePath("/student");
  revalidatePath("/student/monitoring");
  revalidatePath("/student/burnout");
  revalidatePath("/student/recommendations");
  revalidatePath("/student/notifications");
  revalidatePath("/instructor");
  revalidatePath("/instructor/notifications");
  revalidatePath("/instructor/monitoring");

  return {
    success: `Week ${week_number} submitted. MFBI ${Number(finalized.mfbiScore).toFixed(2)} (${finalized.burnoutLevel}). Prediction: ${finalized.prediction}.`,
  };
}

export async function markNotificationRead(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const { supabase, user } = await requireUser();
  const notificationId = Number(formData.get("notification_id"));

  if (!notificationId) {
    return { error: "Invalid notification." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("notification_id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/student");
  revalidatePath("/student/notifications");
  revalidatePath("/instructor");
  revalidatePath("/instructor/notifications");
  revalidatePath("/guidance");
  revalidatePath("/guidance/notifications");
  return { success: "Notification marked as read." };
}

export async function markAllNotificationsRead(
  _prev: StudentActionState
): Promise<StudentActionState> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/student");
  revalidatePath("/student/notifications");
  revalidatePath("/instructor");
  revalidatePath("/instructor/notifications");
  revalidatePath("/guidance");
  revalidatePath("/guidance/notifications");
  return { success: "All notifications marked as read." };
}

export async function setStudentGender(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const { supabase, user, profile } = await requireRole(["Student"]);

  if (profile.sex === "Male" || profile.sex === "Female") {
    return { success: "Gender already saved." };
  }

  const sexRaw = String(formData.get("sex") || "").trim();
  const sex = sexRaw === "Male" || sexRaw === "Female" ? sexRaw : null;

  if (!sex) {
    return { error: "Please select your gender." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ sex })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "UPDATE_PROFILE",
      action_type: "UPDATE",
      table_name: "profiles",
      record_id: user.id,
      description: `Student set gender to ${sex}`,
      ip_address: await getRequestIp(),
    })
  );

  revalidatePath("/", "layout");
  revalidatePath("/student");
  revalidatePath("/profile");
  return { success: "Gender saved." };
}

export async function submitResearchConsent(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const { supabase, user, profile } = await requireRole(["Student"]);

  const decision = String(formData.get("decision") || "").trim();
  const status =
    decision === "Agreed" || decision === "Declined" ? decision : null;

  if (!status) {
    return { error: "Please choose I Agree or I Do Not Agree." };
  }

  const readUnderstood = String(formData.get("read_understood") || "") === "1";
  const voluntarilyAgreed =
    String(formData.get("voluntarily_agreed") || "") === "1";

  if (status === "Agreed" && (!readUnderstood || !voluntarilyAgreed)) {
    return {
      error:
        "Please check both boxes to confirm you understand and voluntarily agree.",
    };
  }

  const consentedAt = new Date().toISOString();
  const ip = await getRequestIp();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      research_consent_status: status,
      research_consent_version: RESEARCH_CONSENT_VERSION,
      research_consent_at: consentedAt,
    })
    .eq("id", user.id);

  if (profileError) {
    return {
      error:
        profileError.message.includes("research_consent")
          ? "Consent storage is not set up yet. Ask Guidance to run supabase/phase10-research-consent.sql."
          : profileError.message,
    };
  }

  const { error: consentError } = await supabase
    .from("research_consents")
    .insert({
      student_id: user.id,
      student_number: profile.student_number,
      consent_status: status,
      consent_version: RESEARCH_CONSENT_VERSION,
      read_understood: status === "Agreed" ? readUnderstood : false,
      voluntarily_agreed: status === "Agreed" ? voluntarilyAgreed : false,
      ip_address: ip,
      consented_at: consentedAt,
    });

  if (consentError) {
    // Profile already updated; still surface a soft warning for audit insert failures.
    console.error("research_consents insert:", consentError.message);
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action:
        status === "Agreed"
          ? "RESEARCH_CONSENT_AGREED"
          : "RESEARCH_CONSENT_DECLINED",
      action_type: "UPDATE",
      table_name: "research_consents",
      record_id: user.id,
      description: `Student ${status.toLowerCase()} research consent ${RESEARCH_CONSENT_VERSION}`,
      ip_address: ip,
    })
  );

  if (status === "Declined") {
    const { data: openLogin } = await supabase
      .from("login_history")
      .select("login_history_id")
      .eq("user_id", user.id)
      .is("logout_time", null)
      .order("login_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openLogin?.login_history_id) {
      await supabase
        .from("login_history")
        .update({ logout_time: new Date().toISOString() })
        .eq("login_history_id", openLogin.login_history_id);
    }

    await supabase.auth.signOut();
    redirect("/login");
  }

  revalidatePath("/", "layout");
  revalidatePath("/student");
  revalidatePath("/student/monitoring");
  revalidatePath("/profile");

  return {
    success: "Thank you. Your consent has been recorded.",
  };
}
