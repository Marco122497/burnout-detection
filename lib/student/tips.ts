import { classifyMfbiScore, type BurnoutLevel } from "@/lib/student/mfbi";
import { classifyTrendDirection } from "@/lib/student/burnout-trends";

export type TipCategory = "Stress" | "Sleep" | "Study time" | "Schoolwork";

export type FactorKey = "stress" | "workload" | "studyTime" | "sleep";

export type Tip = {
  category: TipCategory;
  title: string;
  tips: string[];
};

export type OverallRecommendation = {
  title: string;
  description: string;
  recommended_action: string;
  burnout_level: BurnoutLevel;
};

export type FactorRecommendation = {
  key: FactorKey;
  category: TipCategory;
  title: string;
  description: string;
  recommended_action: string;
  level: BurnoutLevel;
  tips: string[];
  normalized: number;
  /** Week-over-week factor direction when previous week is available. */
  factorTrend?: "increasing" | "decreasing" | "stable" | null;
};

export type CounselingRecommendation = {
  title: string;
  description: string;
  recommended_action: string;
  burnout_level: BurnoutLevel;
  basis: "next_week" | "current" | null;
  trend: string | null;
  currentLevel: BurnoutLevel | null;
  nextWeekRisk: BurnoutLevel | null;
  currentMfbi: number | null;
  previousMfbi: number | null;
  factors: FactorRecommendation[];
};

type FactorScore = {
  raw: number;
  normalized: number;
};

export type StudentFactors = {
  stress: FactorScore;
  workload: FactorScore;
  studyTime: FactorScore;
  sleep: FactorScore;
};

export function buildStudentFactors(
  latest: {
    stress_score: number;
    academic_workload: number;
    study_time: number;
    sleep_hours: number;
  },
  mfbi: {
    normalized_stress?: number | null;
    normalized_workload?: number | null;
    normalized_academic_workload?: number | null;
    normalized_study_time?: number | null;
    normalized_sleep?: number | null;
    normalized_sleep_hours?: number | null;
  }
): StudentFactors {
  return {
    stress: {
      raw: latest.stress_score,
      normalized: Number(mfbi.normalized_stress ?? 0),
    },
    workload: {
      raw: latest.academic_workload,
      normalized: Number(
        mfbi.normalized_workload ?? mfbi.normalized_academic_workload ?? 0
      ),
    },
    studyTime: {
      raw: latest.study_time,
      normalized: Number(mfbi.normalized_study_time ?? 0),
    },
    sleep: {
      raw: latest.sleep_hours,
      normalized: Number(mfbi.normalized_sleep ?? mfbi.normalized_sleep_hours ?? 0),
    },
  };
}

const OVERALL: Record<BurnoutLevel, OverallRecommendation> = {
  Low: {
    burnout_level: "Low",
    title: "You are doing well. Keep it up.",
    description:
      "Your burnout score is low. Your stress, schoolwork, study time, and sleep look okay. Keep the habits that are helping you.",
    recommended_action:
      "Sleep 7–8 hours, take short breaks, and fill out next week’s form.",
  },
  Moderate: {
    burnout_level: "Moderate",
    title: "Make a small change this week.",
    description:
      "Your burnout score is medium. Stress, schoolwork, study time, or sleep may need attention. A small change now can stop it from getting worse.",
    recommended_action:
      "Pick one thing to ease this week: sleep earlier, do less extra work, or stop a long study night.",
  },
  High: {
    burnout_level: "High",
    title: "Please rest and ask for help.",
    description:
      "Your burnout score is high. Stress, schoolwork, study time, or sleep may be too much. This is a school warning, not a medical diagnosis.",
    recommended_action:
      "Talk to the Guidance Office this week. Sleep first. Drop extra tasks if you can.",
  },
  Severe: {
    burnout_level: "Severe",
    title: "Please get help now.",
    description:
      "Your risk is very high. Rest, less school load, and talking to a counselor are important. This app only gives school advice.",
    recommended_action:
      "Talk to the Guidance Counselor as soon as you can. Tell a teacher or family member you trust.",
  },
};

const RISK_RANK: Record<BurnoutLevel, number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Severe: 2,
};

function higherRiskLevel(
  a: BurnoutLevel | null | undefined,
  b: BurnoutLevel | null | undefined
): BurnoutLevel | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

const FACTOR_TIPS: Record<
  FactorKey,
  Record<BurnoutLevel, Omit<FactorRecommendation, "key" | "level" | "normalized">>
> = {
  stress: {
    Low: {
      category: "Stress",
      title: "Your stress looks okay",
      description: "You are not too stressed right now. Keep checking in with yourself.",
      recommended_action: "After class, ask: how do I feel today? Do one fun thing this week.",
      tips: [
        "Each day, notice if you feel calm or tense.",
        "Take 3 slow breaths between classes.",
        "Do one fun thing this week, like a walk or time with friends.",
        "Do not add extra tasks on already busy days.",
        "Keep a short list of what you can control today.",
        "Stretch your shoulders for 1 minute after long screen time.",
      ],
    },
    Moderate: {
      category: "Stress",
      title: "Your stress is moderate",
      description: "You are under some pressure. Keep calming habits so it does not climb.",
      recommended_action: "Breathe slowly for 5 minutes a day. Write down 2 things that worry you.",
      tips: [
        "Breathe slowly for 5–10 minutes each day.",
        "Talk to a friend, teacher, or counselor about what feels hard.",
        "Do one task at a time. Finish it before starting another.",
        "After a test or big paper, rest before starting the next one.",
        "Write down worries, then circle only what you can act on today.",
        "Take a 10-minute walk when you feel nervous or tense.",
        "Pause social media when it makes stress feel louder.",
      ],
    },
    High: {
      category: "Stress",
      title: "Your stress is high",
      description: "Stress is a big part of your burnout score. Rest and help come first.",
      recommended_action: "When you feel overwhelmed, pause and breathe. Talk to Guidance this week.",
      tips: [
        "When you feel panic, breathe out slowly and name 5 things you can see.",
        "Visit the Guidance Office this week.",
        "Say no to extra clubs or tasks for now.",
        "Tell one person you trust how you feel.",
        "Break the day into morning, afternoon, and evening — do one thing per block.",
        "If tasks feel piled up, pick the top 3 only and ignore the rest today.",
        "Use a short body reset: unclench jaw, drop shoulders, slow exhale.",
      ],
    },
    Severe: {
      category: "Stress",
      title: "Please get help for stress",
      description: "Your stress is very high. Rest and talking to someone matter most.",
      recommended_action: "Talk to the Guidance Counselor as soon as you can.",
      tips: [
        "Talk to the Guidance Counselor as soon as you can.",
        "Tell a family member or teacher how you feel.",
        "If you feel very unsafe or very sad, ask for help right away.",
        "Pause extra work until you have support.",
        "Do only required classwork today; rest counts as progress.",
        "Ask someone to sit with you while you make a simple next-step plan.",
      ],
    },
  },
  workload: {
    Low: {
      category: "Schoolwork",
      title: "Your schoolwork looks okay",
      description: "Your class load is manageable. Plan a little so due dates do not pile up.",
      recommended_action: "Write this week’s due dates. Start the biggest task one day early.",
      tips: [
        "Split big work into small steps.",
        "Do the homework that is due soonest first.",
        "Ask your teacher early if you do not understand the task.",
        "Check your due dates once a week.",
        "Keep one notebook or app for all class tasks.",
        "Start the longest assignment first while your energy is high.",
      ],
    },
    Moderate: {
      category: "Schoolwork",
      title: "Your schoolwork is somewhat heavy",
      description: "Your class load is medium-high. Keep tasks organized so burnout does not climb.",
      recommended_action: "List every task and due date. Drop or delay one extra thing this week.",
      tips: [
        "Write all tasks and due dates in one list.",
        "Ask for more time early if you cannot finish on time.",
        "Pause extra work until required work is done.",
        "Do similar tasks together, like all readings in one sitting.",
        "Mark each task Must / Can wait / Extra — finish Must first.",
        "Ask classmates to clarify instructions before you spend hours guessing.",
        "Block 30 minutes daily for catching up instead of one long cram night.",
      ],
    },
    High: {
      category: "Schoolwork",
      title: "Your schoolwork is too heavy",
      description: "Schoolwork is a big reason your burnout score is high.",
      recommended_action: "Talk to a teacher. Pick one task to delay, split, or make smaller.",
      tips: [
        "Talk to a teacher or adviser this week about your load.",
        "Pick one task to delay, split, or make smaller.",
        "Do not add new extra work.",
        "Ask classmates to share notes or split group work fairly.",
        "Email or message teachers with one clear ask: deadline help or priority order.",
        "Remove one optional club task or make-up activity this week.",
        "Use a timer: 40 minutes work, 10 minutes break, then switch subjects.",
      ],
    },
    Severe: {
      category: "Schoolwork",
      title: "Please ask for help with schoolwork",
      description: "Your class load is very high. It is okay to ask for help.",
      recommended_action: "Talk to Guidance and your teachers about what to finish first.",
      tips: [
        "Ask Guidance about school support.",
        "Ask teachers which work must be done first.",
        "Follow the plan Guidance gives you.",
        "Do not start new projects until current work is under control.",
        "Bring your full task list to Guidance or a teacher so they can help prioritize.",
        "Tell group mates early if you cannot carry more group work right now.",
      ],
    },
  },
  studyTime: {
    Low: {
      category: "Study time",
      title: "Your study time looks okay",
      description: "You are not studying too long. Short, focused study is better than extra hours.",
      recommended_action: "Study for 25–50 minutes, then take a short break. Stop when the time is up.",
      tips: [
        "Study in 25–50 minute blocks.",
        "Take a short break after each block.",
        "Review a little each day instead of cramming at night.",
        "Study the hardest subject when you feel most awake.",
        "Close extra tabs and silence your phone while you study.",
        "End each study block by writing one question to review tomorrow.",
      ],
    },
    Moderate: {
      category: "Study time",
      title: "You may be studying too long",
      description: "Long study hours with little rest can make you tired and hurt your sleep.",
      recommended_action: "Stop when you are very tired. Do not study late if the work is not urgent.",
      tips: [
        "Stop studying when you feel very tired.",
        "Group similar work so you do not keep switching tasks.",
        "Do easy review in the day, not late at night.",
        "Test yourself instead of only rereading notes.",
        "Set a hard stop time for study tonight.",
        "Replace one long reread with a short quiz or flashcards.",
        "Study with a clear goal (finish 1 chapter), not “until late.”",
      ],
    },
    High: {
      category: "Study time",
      title: "Your study time is high",
      description: "Long study time is raising your burnout score. More hours will not help if you are already tired.",
      recommended_action: "Do only the most important work today. Split one long night into two shorter times.",
      tips: [
        "Do only the most important work.",
        "Quiz yourself instead of reading for hours.",
        "Study with a friend to stay on task, not to stay longer.",
        "Set a stop time at night so you can sleep.",
        "Cut one study session this week and use active recall instead.",
        "Split a long night into two shorter daytime blocks.",
        "If you keep rereading the same page, stop and rest — then try again tomorrow.",
      ],
    },
    Severe: {
      category: "Study time",
      title: "Your study time is very high",
      description: "You have been studying too much. Do only what is due soon, then rest.",
      recommended_action: "For the next 2 days, do only work that is due. Ask a classmate for notes.",
      tips: [
        "For 2 days, do only work that is due.",
        "Use short study times instead of all-night sessions.",
        "Ask a classmate for notes instead of doing everything alone.",
        "Go back to a normal study plan after you rest.",
        "Cap study at shorter blocks and protect sleep as a required stop.",
        "Tell a teacher if fatigue is affecting class — ask what to prioritize.",
      ],
    },
  },
  sleep: {
    Low: {
      category: "Sleep",
      title: "Your sleep risk is low",
      description: "You are sleeping well enough. Keep a regular bedtime so this stays good.",
      recommended_action: "Sleep 7–8 hours most nights. Go to bed at about the same time.",
      tips: [
        "Sleep 7–8 hours most nights.",
        "Go to bed at about the same time on school nights.",
        "Put your phone away 30 minutes before bed.",
        "Avoid coffee, tea, or energy drinks late in the day.",
        "Keep your room cooler and darker for easier sleep.",
        "Use bed mainly for sleep, not for long study sessions.",
      ],
    },
    Moderate: {
      category: "Sleep",
      title: "Your sleep risk is moderate",
      description: "Your sleep is not enough. Poor sleep can make stress and school feel harder.",
      recommended_action: "Sleep at least 7 hours tonight. Skip late caffeine. Quiet down before bed.",
      tips: [
        "Try to sleep at least 7 hours tonight.",
        "Do not drink caffeine after mid-afternoon.",
        "Dim the lights and do not study in bed.",
        "If you nap, keep it under 30 minutes.",
        "Set a phone alarm for wind-down 45 minutes before bed.",
        "Write tomorrow’s top 3 tasks before bed so your mind can rest.",
        "Avoid heavy meals and bright screens in the last hour before sleep.",
      ],
    },
    High: {
      category: "Sleep",
      title: "Your sleep risk is high",
      description: "Poor sleep is a big part of your burnout score. Rest helps you do schoolwork better.",
      recommended_action: "Sleep tonight. Do not plan to stay up all night.",
      tips: [
        "Treat sleep as required, like a class you must attend.",
        "Keep naps under 30 minutes.",
        "Do not stay up all night. Split the work across days.",
        "Make your room dark and quiet so you can fall asleep.",
        "Move unfinished work to tomorrow’s morning block instead of overnight.",
        "If you cannot fall asleep, get up briefly, then try again — do not study in bed.",
        "Skip late caffeine and energy drinks completely for a few days.",
      ],
    },
    Severe: {
      category: "Sleep",
      title: "Your sleep risk is very high",
      description: "Your sleep is very poor. Sleep tonight before adding more study.",
      recommended_action: "Sleep first tonight. Tell Guidance if this lasts several nights.",
      tips: [
        "Sleep tonight instead of doing extra work that is not due.",
        "Keep the room dark and quiet.",
        "Ask for help if you cannot sleep for several nights.",
        "Tell Guidance if you are too tired to go to class.",
        "Prioritize tonight’s sleep over optional review.",
        "Ask a trusted adult or Guidance if sleep problems continue past a few nights.",
      ],
    },
  },
};

const FACTOR_ORDER: FactorKey[] = ["stress", "workload", "studyTime", "sleep"];

const TIP_LIMIT = 8;

function uniqueTips(tips: string[], limit = TIP_LIMIT): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tip of tips) {
    const normalized = tip.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(tip.trim());
    if (out.length >= limit) break;
  }
  return out;
}

function isElevated(level: BurnoutLevel) {
  return level === "Moderate" || level === "High" || level === "Severe";
}

function isHighRisk(level: BurnoutLevel) {
  return level === "High" || level === "Severe";
}

/**
 * Extra tips keyed to MFBI section raw scores (PSS 0–40, workload 0–10,
 * study hours/week 0–25, sleep risk 0–100) and PSS / workload themes.
 */
function tipsForRawScore(key: FactorKey, raw: number): string[] {
  if (!Number.isFinite(raw)) return [];

  if (key === "stress") {
    // PSS-10 total after reverse scoring
    if (raw <= 13) {
      return [
        "Keep naming one thing that went okay each day so confidence stays steady.",
        "When something unexpected happens, pause before reacting.",
      ];
    }
    if (raw <= 20) {
      return [
        "When something unexpected upsets you, write what happened and one next step.",
        "Practice one “I can handle this” line when problems feel out of control.",
        "Schedule a short break after stressful classes before starting homework.",
      ];
    }
    if (raw <= 26) {
      return [
        "If tasks feel like they are piling up, list them and cut the list to 3 today.",
        "Ask for help early when you cannot cope with everything alone.",
        "When you feel nervous or stressed, use slow breathing before you open your phone.",
        "End the day by noting one problem you handled — even a small one.",
      ];
    }
    if (raw <= 33) {
      return [
        "When difficulties feel too high to overcome, talk to Guidance this week.",
        "Reduce decisions: same wake time, same study stop time, same wind-down.",
        "Tell a trusted person which pressure feels most out of your control.",
        "Do not stack new commitments while stress answers stay this high.",
      ];
    }
    return [
      "Seek Guidance support now — your stress answers are in the highest range.",
      "Focus only on safety, rest, and required classwork until you have support.",
      "Ask a teacher or family member to help you make a simple plan for this week.",
    ];
  }

  if (key === "workload") {
    // Academic workload 0–10
    if (raw < 4) {
      return [
        "Preview next week’s due dates so a light week does not become a pile-up.",
        "Finish one small task early to keep your load steady.",
      ];
    }
    if (raw < 7) {
      return [
        "Your workload answers show medium pressure — protect one free evening this week.",
        "Batch similar homework so switching classes costs less energy.",
        "Ask teachers which assignments matter most before midterms or finals.",
      ];
    }
    if (raw < 8.5) {
      return [
        "Your workload score is high — cut optional extras before required work slips.",
        "Negotiate one deadline or split one large submission into parts.",
        "Use a shared calendar with due dates for every subject in one place.",
      ];
    }
    return [
      "Your workload score is near the top — talk with teachers and Guidance about priorities.",
      "Do not accept new group roles until current deadlines are under control.",
      "Bring a printed or written task list when you ask for deadline help.",
    ];
  }

  if (key === "studyTime") {
    // Estimated study hours/week (0–STUDY_TIME_SCORE_MAX)
    if (raw < 10) {
      return [
        "Keep short focused blocks; quality beats adding more hours.",
        "Review notes the same day as class while memory is fresh.",
      ];
    }
    if (raw < 17.5) {
      return [
        "Your study hours are in a range where sleep can suffer — set a stop time this week.",
        "Swap one long reread for practice questions or flashcards.",
        "Study in two daytime blocks instead of one late night.",
      ];
    }
    if (raw < 22) {
      return [
        "Your study hours are high for recovery — cut one session this week.",
        "Use active recall: close notes and write what you remember.",
        "Study with a timer and leave when it rings, even if you want “just a bit more.”",
      ];
    }
    return [
      "Your study load is very high — rest will help more than extra hours.",
      "For 48 hours, study only what is due soon, then rebuild a lighter plan.",
      "Ask a classmate for notes so you are not redoing everything alone.",
    ];
  }

  // sleep risk 0–100
  if (raw < 40) {
    return [
      "Keep the bedtime that is working — protect it on busy school nights too.",
      "If you nap, keep it early and short so night sleep stays easy.",
    ];
  }
  if (raw < 70) {
    return [
      "Your sleep answers show moderate risk — aim for 7+ hours for the next 3 nights.",
      "Move studying out of bed so your brain links bed with sleep.",
      "Skip caffeine after mid-afternoon for the rest of this week.",
    ];
  }
  if (raw < 85) {
    return [
      "Sleep risk is high from your questionnaire — sleep tonight before optional review.",
      "Split overnight work across two days instead of staying up.",
      "Make the room dark and quiet; put the phone outside arm’s reach.",
    ];
  }
  return [
    "Your sleep risk score is very high — rest first, then ask Guidance if this continues.",
    "Cancel non-urgent late-night study until you sleep several nights in a row.",
    "Tell a trusted adult if you cannot sleep or stay awake in class.",
  ];
}

function crossFactorTipsForKey(
  key: FactorKey,
  factors: StudentFactors
): string[] {
  const levels = {
    stress: classifyFactorScore(factors.stress.normalized),
    workload: classifyFactorScore(factors.workload.normalized),
    studyTime: classifyFactorScore(factors.studyTime.normalized),
    sleep: classifyFactorScore(factors.sleep.normalized),
  };

  const tips: string[] = [];

  if (key === "studyTime" && isElevated(levels.studyTime) && isElevated(levels.sleep)) {
    tips.push(
      "Long study time and sleep risk are both up — end study at a fixed time so you can sleep."
    );
  }
  if (key === "sleep" && isElevated(levels.studyTime) && isElevated(levels.sleep)) {
    tips.push(
      "Do not trade sleep for extra study hours; tired studying raises burnout more."
    );
  }
  if (key === "stress" && isElevated(levels.stress) && isElevated(levels.workload)) {
    tips.push(
      "High stress plus heavy schoolwork: cut one extra task before adding new coping habits."
    );
  }
  if (key === "workload" && isElevated(levels.stress) && isElevated(levels.workload)) {
    tips.push(
      "When stress and schoolwork are both high, ask one teacher what to finish first."
    );
  }
  if (key === "stress" && isElevated(levels.stress) && isElevated(levels.sleep)) {
    tips.push(
      "Poor sleep makes stress feel worse — protect bedtime even on heavy days."
    );
  }
  if (key === "sleep" && isElevated(levels.stress) && isElevated(levels.sleep)) {
    tips.push(
      "Write worries on paper before bed so stress does not keep you awake."
    );
  }
  if (
    key === "studyTime" &&
    isElevated(levels.studyTime) &&
    isElevated(levels.workload)
  ) {
    tips.push(
      "Heavy schoolwork plus long study hours: focus only on due work, not perfect notes."
    );
  }
  if (key === "stress" && isHighRisk(levels.stress) && isHighRisk(levels.studyTime)) {
    tips.push(
      "High stress with very long study time: take a full rest evening before the next long session."
    );
  }

  return tips;
}

function scoreAwareAction(
  key: FactorKey,
  level: BurnoutLevel,
  raw: number,
  baseAction: string
): string {
  if (!Number.isFinite(raw)) return baseAction;

  if (key === "stress" && raw >= 27) {
    return "Talk to the Guidance Office this week. Pause extra commitments until stress eases.";
  }
  if (key === "workload" && raw >= 8) {
    return "Bring your full task list to a teacher or adviser and ask what to delay or split.";
  }
  if (key === "studyTime" && raw >= 20) {
    return "Cap study tonight with a hard stop time. Split remaining work across two shorter days.";
  }
  if (key === "sleep" && raw >= 70) {
    return "Sleep first tonight. Move non-urgent work to daytime blocks this week.";
  }
  if (level === "Low") return baseAction;
  return baseAction;
}

function enrichFactorWithScores(
  key: FactorKey,
  level: BurnoutLevel,
  item: Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend">,
  options?: {
    raw?: number | null;
    factors?: StudentFactors | null;
  }
): Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend"> {
  const raw = options?.raw;
  const factors = options?.factors ?? null;
  const extras = [
    ...(raw != null ? tipsForRawScore(key, raw) : []),
    ...(factors ? crossFactorTipsForKey(key, factors) : []),
  ];

  const tips = uniqueTips([...extras, ...item.tips]);
  const recommended_action =
    raw != null
      ? scoreAwareAction(key, level, raw, item.recommended_action)
      : item.recommended_action;

  return { ...item, tips, recommended_action };
}

function overallActionFromFactors(
  level: BurnoutLevel,
  baseAction: string,
  factors: FactorRecommendation[]
): string {
  const focus = [...factors]
    .filter((f) => f.level !== "Low")
    .sort((a, b) => b.normalized - a.normalized)[0];
  if (!focus) return baseAction;

  if (level === "Low") {
    return `${baseAction} Keep an eye on ${focus.category.toLowerCase()} so it stays steady.`;
  }

  const focusAction = focus.recommended_action.replace(/\s+Also seek.*$/i, "").trim();
  if (isHighRisk(level) || isHighRisk(focus.level)) {
    return `${focusAction} Also seek the Guidance Office if this still feels too heavy.`;
  }
  return `Focus first on ${focus.category.toLowerCase()}: ${focusAction}`;
}

export function classifyFactorScore(normalized: number | null | undefined): BurnoutLevel {
  if (normalized == null || Number.isNaN(normalized)) return "Low";
  return classifyMfbiScore(normalized);
}

const FACTOR_WARNING_LABELS: Record<FactorKey, string> = {
  stress: "stress",
  workload: "academic workload",
  studyTime: "study time",
  sleep: "sleep",
};

function formatFactorList(labels: string[]) {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * Simple, professional early-warning copy grounded in elevated MFBI factors.
 */
export function buildMfbiEarlyWarningMessage(options: {
  factors: StudentFactors | null | undefined;
  trend?: string | null;
  burnoutLevel?: string | null;
}): string | null {
  const { factors, trend, burnoutLevel } = options;
  if (!factors) return null;

  const elevated = FACTOR_ORDER.filter((key) =>
    isElevated(classifyFactorScore(factors[key].normalized))
  ).map((key) => FACTOR_WARNING_LABELS[key]);

  const overallElevated = isElevated(
    (burnoutLevel as BurnoutLevel | null) ?? "Low"
  );

  if (elevated.length === 0 && !overallElevated) return null;

  const factorPhrase =
    elevated.length > 0
      ? formatFactorList(elevated)
      : "monitoring scores";

  const trendPhrase =
    trend === "increasing"
      ? "indicate increasing burnout risk"
      : trend === "decreasing"
        ? "remain elevated, though the overall trend is improving"
        : trend === "stable"
          ? "suggest steady pressure that still needs attention"
          : "suggest areas that may need attention";

  const actionFocus =
    elevated.length > 0
      ? formatFactorList(elevated)
      : "workload, study habits, and sleep";

  return `Your recent ${factorPhrase} patterns ${trendPhrase}. Consider reviewing your ${actionFocus}. This is an early-warning indicator, not a medical diagnosis.`;
}

export function getOverallRecommendation(
  level: BurnoutLevel | null | undefined,
  options?: {
    trend?: string | null;
    currentMfbi?: number | null;
    previousMfbi?: number | null;
  }
): OverallRecommendation | null {
  if (!level) return null;
  const base = OVERALL[level] ?? OVERALL.Low;
  const trend = options?.trend ?? null;
  const currentMfbi = options?.currentMfbi ?? null;
  const previousMfbi = options?.previousMfbi ?? null;
  const mfbiLabel =
    currentMfbi != null && Number.isFinite(currentMfbi)
      ? ` Your current burnout index is about ${Number(currentMfbi).toFixed(2)}.`
      : "";
  const mfbiChangeLabel =
    currentMfbi != null &&
    previousMfbi != null &&
    Number.isFinite(currentMfbi) &&
    Number.isFinite(previousMfbi)
      ? ` Your burnout index has ${
          Number(currentMfbi) < Number(previousMfbi) ? "decreased" : "changed"
        } from ${Number(previousMfbi).toFixed(2)} to ${Number(currentMfbi).toFixed(2)}.`
      : mfbiLabel;

  // Current risk + historical trend = early-warning outlook
  if (trend === "decreasing") {
    if (level === "Low") {
      return {
        ...base,
        title: "Your risk is improving — keep it going.",
        description: `Your risk is improving and is now low.${mfbiChangeLabel} Keep doing what helped so it stays low.`,
        recommended_action:
          "Protect sleep, keep short breaks, and complete next week’s monitoring.",
      };
    }
    if (level === "Moderate") {
      return {
        ...base,
        title: "Your risk is improving — continue the changes that are helping.",
        description: `Your burnout outlook is improving and is now moderate.${mfbiChangeLabel} Keep the habits that helped so it does not climb again.`,
        recommended_action:
          "Keep the changes that lowered your score: steady sleep, lighter extra load, and shorter late-night study.",
      };
    }
    return {
      ...base,
      title: "Your risk is improving — continue monitoring and support strategies.",
      description: `Your score is moving down, which is progress, but burnout risk is still high.${mfbiChangeLabel} Keep resting and ask for help if you need it.`,
      recommended_action:
        "Continue lighter load and better sleep. Visit Guidance if things still feel heavy.",
    };
  }

  if (trend === "increasing") {
    if (level === "Low") {
      return {
        ...base,
        title: "Your risk is starting to rise — stay aware.",
        description: `Your burnout risk is still low, but the trend is increasing.${mfbiLabel} Small habits this week can keep it from climbing.`,
        recommended_action:
          "Keep sleep steady, avoid stacking extra work, and stop long study nights early.",
      };
    }
    if (level === "Moderate") {
      return {
        ...base,
        title: "Your risk is rising — act early.",
        description: `Your burnout outlook is increasing and is now moderate.${mfbiLabel} A small change this week can stop it from becoming high.`,
        recommended_action:
          "Ease one pressure this week: sleep earlier, cut extra work, or end long study nights sooner.",
      };
    }
    return {
      ...base,
      title: "Your risk is increasing — seek support early.",
      description: `Your burnout risk is high and the trend is going up.${mfbiLabel} Treat this as an early warning and get support soon.`,
      recommended_action:
        "Talk to the Guidance Office this week. Sleep first. Drop extra tasks if you can.",
    };
  }

  if (trend === "stable") {
    if (level === "Low") {
      return {
        ...base,
        title: "Your risk is currently low — maintain your routine.",
        description: `Your burnout risk is low and stable.${mfbiLabel} Keep the habits that are working.`,
        recommended_action:
          "Sleep 7–8 hours, take short breaks, and fill out next week’s form.",
      };
    }
    if (level === "Moderate") {
      return {
        ...base,
        title: "Your risk remains moderate — make small adjustments now.",
        description: `Your burnout risk remains moderate.${mfbiLabel} Small adjustments this week can keep it from rising.`,
        recommended_action:
          "Pick one thing to ease this week: sleep earlier, do less extra work, or stop a long study night.",
      };
    }
    return {
      ...base,
      title: "Your risk remains high — additional support is recommended.",
      description: `Your burnout risk remains high.${mfbiLabel} Extra support and rest are recommended this week.`,
      recommended_action:
        "Talk to the Guidance Office this week. Sleep first. Drop extra tasks if you can.",
    };
  }

  return {
    ...base,
    description: `${base.description}${mfbiLabel}`,
  };
}

/**
 * Align counseling tips with early-warning outlook and trend:
 * - Decreasing (e.g. 1.00 → 0.60): use current week level so tips match the
 *   improvement, not a stale High from prior week / pessimistic ML.
 * - Increasing: prefer next-week (or the higher of current vs next-week).
 * - Otherwise: prefer next-week when available.
 */
export function resolveRecommendationLevel(
  currentLevel: BurnoutLevel | null | undefined,
  nextWeekRisk: BurnoutLevel | null | undefined,
  options?: {
    trend?: string | null;
  }
): {
  level: BurnoutLevel | null;
  basis: "next_week" | "current" | null;
  trend: string | null;
} {
  const trend = options?.trend ?? null;

  if (trend === "decreasing" && currentLevel) {
    return {
      level: currentLevel,
      basis: "current",
      trend,
    };
  }

  if (trend === "increasing") {
    const level =
      higherRiskLevel(currentLevel, nextWeekRisk) ??
      nextWeekRisk ??
      currentLevel ??
      null;
    return {
      level,
      basis: nextWeekRisk ? "next_week" : currentLevel ? "current" : null,
      trend,
    };
  }

  if (nextWeekRisk) {
    return { level: nextWeekRisk, basis: "next_week", trend };
  }
  if (currentLevel) {
    return { level: currentLevel, basis: "current", trend };
  }
  return { level: null, basis: null, trend };
}

/** Week-over-week MFBI change from submitted monitoring only. */
export function resolveMonitoringWeekTrend(
  currentMfbi: number | null | undefined,
  previousMfbi: number | null | undefined
): string | null {
  if (currentMfbi == null || previousMfbi == null) return null;
  const direction = classifyTrendDirection(
    Number(currentMfbi),
    Number(previousMfbi)
  );
  return direction === "insufficient_history" ? null : direction;
}

/**
 * Prefer early-warning trend; otherwise infer from consecutive MFBI scores
 * (e.g. 1.00 → 0.60 => decreasing).
 */
export function resolveRecommendationTrend(
  earlyWarningTrend: string | null | undefined,
  currentMfbi: number | null | undefined,
  previousMfbi: number | null | undefined
): string | null {
  if (earlyWarningTrend && earlyWarningTrend !== "insufficient_history") {
    return earlyWarningTrend;
  }
  if (currentMfbi == null || previousMfbi == null) return null;
  const direction = classifyTrendDirection(
    Number(currentMfbi),
    Number(previousMfbi)
  );
  return direction === "insufficient_history" ? null : direction;
}

const DECREASING_FACTOR_COPY: Record<
  FactorKey,
  Partial<Record<BurnoutLevel, Pick<FactorRecommendation, "title" | "description">>>
> = {
  stress: {
    Low: {
      title: "Your stress is improving",
      description:
        "Stress looks better than before. Keep the calming habits that helped.",
    },
    Moderate: {
      title: "Your stress is improving",
      description:
        "Stress is moving down, but it is still moderate. Keep breathing breaks so it does not climb again.",
    },
    High: {
      title: "Your stress is still high",
      description:
        "Stress is starting to go down, but it is still high. Keep resting and ask for help if you need it.",
    },
    Severe: {
      title: "Your stress is still very high",
      description:
        "There is some improvement, but stress is still very high. Get support while you keep resting.",
    },
  },
  workload: {
    Low: {
      title: "Your workload has improved",
      description:
        "Your class load looks more manageable than before. Keep planning due dates.",
    },
    Moderate: {
      title: "Your workload has improved",
      description:
        "Your schoolwork load is improving, but it is still moderate. Keep one clear task list.",
    },
    High: {
      title: "Your schoolwork is still heavy",
      description:
        "Your load is moving down, but schoolwork is still heavy. Keep cutting extras and asking for help.",
    },
    Severe: {
      title: "Your schoolwork is still very heavy",
      description:
        "There is progress, but your load is still very high. Keep talking with teachers and Guidance.",
    },
  },
  studyTime: {
    Low: {
      title: "Your study time has decreased",
      description:
        "Study hours look healthier than before. Keep short, focused blocks.",
    },
    Moderate: {
      title: "Your study time has decreased",
      description:
        "Long study nights are improving, but study time is still moderate. Keep stop times so sleep stays protected.",
    },
    High: {
      title: "Your study time is still high",
      description:
        "You are cutting back, but study time is still high. Keep splitting long nights into shorter sessions.",
    },
    Severe: {
      title: "Your study time is still very high",
      description:
        "There is progress, but study time is still too high. Prioritize only due work and rest.",
    },
  },
  sleep: {
    Low: {
      title: "Your sleep risk has improved",
      description: "Sleep looks better than before. Keep a steady bedtime.",
    },
    Moderate: {
      title: "Your sleep risk has improved",
      description:
        "Sleep is getting better, but it still needs attention. Keep 7+ hours and quiet wind-down time.",
    },
    High: {
      title: "Your sleep risk is still high",
      description:
        "Sleep risk is moving down, but it is still high. Keep treating rest as required.",
    },
    Severe: {
      title: "Your sleep risk is still very high",
      description:
        "There is some progress, but sleep risk is still very high. Rest first and tell Guidance if it continues.",
    },
  },
};

const INCREASING_FACTOR_COPY: Record<
  FactorKey,
  Partial<Record<BurnoutLevel, Pick<FactorRecommendation, "title" | "description">>>
> = {
  stress: {
    Moderate: {
      title: "Your stress is increasing",
      description:
        "Stress is rising. Small calming habits now can stop next week from feeling harder.",
    },
    High: {
      title: "Your stress is increasing",
      description:
        "Stress is high and the trend is going up. Rest and support come first.",
    },
    Severe: {
      title: "Your stress is increasing",
      description:
        "Stress is very high and rising. Seek Guidance support this week.",
    },
  },
  workload: {
    Moderate: {
      title: "Your schoolwork is becoming heavier",
      description:
        "Your class load is rising. Organize tasks now so burnout does not climb.",
    },
    High: {
      title: "Your schoolwork is becoming heavier",
      description:
        "Schoolwork is heavy and increasing. Cut extras and talk to a teacher soon.",
    },
    Severe: {
      title: "Your schoolwork is becoming heavier",
      description:
        "Your workload is very high and rising. Ask teachers and Guidance for support.",
    },
  },
  studyTime: {
    Moderate: {
      title: "Your study time has increased",
      description:
        "Study time is rising. Set stop times so sleep and rest do not suffer.",
    },
    High: {
      title: "Your study time has increased",
      description:
        "Study time is high and rising. Cut long nights before burnout gets worse.",
    },
    Severe: {
      title: "Your study time has increased",
      description:
        "Study hours are extreme and rising. Do only due work and rest.",
    },
  },
  sleep: {
    Moderate: {
      title: "Your sleep risk is rising",
      description:
        "Sleep quality is slipping. Protect bedtime before stress and school feel harder.",
    },
    High: {
      title: "Your sleep risk is high and rising",
      description:
        "Sleep risk is high and getting worse. Make rest the first priority this week.",
    },
    Severe: {
      title: "Your sleep risk is very high and rising",
      description:
        "Sleep risk is very high and declining further. Rest first and tell Guidance if it continues.",
    },
  },
};

const STABLE_HIGH_FACTOR_COPY: Record<
  FactorKey,
  Pick<FactorRecommendation, "title" | "description">
> = {
  stress: {
    title: "Your stress remains high",
    description:
      "Stress has stayed high. Keep resting and seek Guidance support this week.",
  },
  workload: {
    title: "Your workload has remained high for several weeks",
    description:
      "Schoolwork has stayed heavy. Talk with teachers and cut extras where you can.",
  },
  studyTime: {
    title: "Your study time has remained high",
    description:
      "Long study hours have continued. Set a stop time and protect sleep.",
  },
  sleep: {
    title: "Your sleep risk remains high",
    description:
      "Sleep risk has stayed high. Make rest a required part of your week.",
  },
};

function factorLevelTrend(
  current: BurnoutLevel,
  previous: BurnoutLevel | null | undefined
): "increasing" | "decreasing" | "stable" | null {
  if (!previous) return null;
  const currentRank = RISK_RANK[current];
  const previousRank = RISK_RANK[previous];
  if (currentRank > previousRank) return "increasing";
  if (currentRank < previousRank) return "decreasing";
  return "stable";
}

function resolveDynamicFactorHeading(
  key: FactorKey,
  level: BurnoutLevel,
  previousLevel: BurnoutLevel | null | undefined
): Pick<FactorRecommendation, "title" | "description"> | null {
  const trend = factorLevelTrend(level, previousLevel);

  if (trend === "increasing") {
    return INCREASING_FACTOR_COPY[key][level] ?? null;
  }
  if (trend === "decreasing") {
    return DECREASING_FACTOR_COPY[key][level] ?? null;
  }
  if (
    trend === "stable" &&
    previousLevel &&
    (level === "High" || level === "Severe") &&
    (previousLevel === "High" || previousLevel === "Severe")
  ) {
    return STABLE_HIGH_FACTOR_COPY[key];
  }

  // Current-level defaults (more counseling-style than the static tip titles)
  if (key === "stress") {
    if (level === "Low") {
      return {
        title: "Your stress looks manageable",
        description: "You are not too stressed right now. Keep checking in with yourself.",
      };
    }
    if (level === "Moderate") {
      return {
        title: "Your stress is moderate",
        description:
          "You are under some pressure. Keep calming habits so it does not climb.",
      };
    }
    if (level === "Severe") {
      return {
        title: "Your stress is very high",
        description: "Stress is a big part of your burnout score. Rest and help come first.",
      };
    }
    return {
      title: "Your stress is high",
      description: "Stress is a big part of your burnout score. Rest and help come first.",
    };
  }

  if (key === "workload") {
    if (level === "Low") {
      return {
        title: "Your schoolwork is manageable",
        description: "Your class load is manageable. Plan a little so due dates do not pile up.",
      };
    }
    if (level === "Moderate") {
      return {
        title: "Your schoolwork is somewhat heavy",
        description:
          "Your class load is medium-high. Keep tasks organized so burnout does not climb.",
      };
    }
    if (level === "Severe") {
      return {
        title: "Your schoolwork is extremely heavy",
        description: "Schoolwork is a big reason your burnout score is high.",
      };
    }
    return {
      title: "Your schoolwork is too heavy",
      description: "Schoolwork is a big reason your burnout score is high.",
    };
  }

  if (key === "studyTime") {
    if (level === "Low") {
      return {
        title: "Your study time looks balanced",
        description:
          "You are not studying too long. Short, focused study is better than extra hours.",
      };
    }
    if (level === "Moderate") {
      return {
        title: "You may be studying too long",
        description:
          "Long study hours with little rest can make you tired and hurt your sleep.",
      };
    }
    if (level === "Severe") {
      return {
        title: "Your study time is very high",
        description:
          "Long study time is raising your burnout score. More hours will not help if you are already tired.",
      };
    }
    return {
      title: "Your study time is high",
      description:
        "Long study time is raising your burnout score. More hours will not help if you are already tired.",
    };
  }

  // sleep — titles use "sleep risk" so they match Low / Moderate / High badges
  if (level === "Low") {
    return {
      title: "Your sleep risk is low",
      description: "You are sleeping well enough. Keep a regular bedtime so this stays good.",
    };
  }
  if (level === "Moderate") {
    return {
      title: "Your sleep risk is moderate",
      description:
        "Your sleep is not enough. Poor sleep can make stress and school feel harder.",
    };
  }
  if (level === "Severe") {
    return {
      title: "Your sleep risk is very high",
      description:
        "Poor sleep is a big part of your burnout score. Rest helps you do schoolwork better.",
    };
  }
  return {
    title: "Your sleep risk is high",
    description:
      "Poor sleep is a big part of your burnout score. Rest helps you do schoolwork better.",
  };
}

/** Display label so Low/High mean risk, not hours of sleep/study. */
export function formatFactorRiskLabel(level: string | null | undefined): string {
  if (!level) return "";
  if (level === "Severe") return "Severe risk";
  if (level === "High") return "High risk";
  if (level === "Moderate") return "Moderate risk";
  if (level === "Low") return "Low risk";
  return level;
}

function withFactorTrendCopy(
  key: FactorKey,
  level: BurnoutLevel,
  item: Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend">,
  trend: string | null | undefined,
  previousLevel?: BurnoutLevel | null
): Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend"> {
  const dynamic = resolveDynamicFactorHeading(key, level, previousLevel);
  if (dynamic) return { ...item, ...dynamic };

  if (trend === "decreasing") {
    const overlay = DECREASING_FACTOR_COPY[key][level];
    if (overlay) return { ...item, ...overlay };
  }
  if (trend === "increasing") {
    const overlay = INCREASING_FACTOR_COPY[key][level];
    if (overlay) return { ...item, ...overlay };
  }
  return item;
}

const GUIDANCE_REFERRAL_TIP =
  "Seek the Guidance Office for counseling support and a guidance referral.";

function withGuidanceReferral(
  item: Omit<
    FactorRecommendation,
    "key" | "level" | "normalized" | "factorTrend"
  >,
  level: BurnoutLevel
): Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend"> {
  if (level !== "High" && level !== "Severe") return item;

  const tips = [
    GUIDANCE_REFERRAL_TIP,
    ...item.tips.filter(
      (tip) => !/guidance office|guidance counselor|talk to guidance/i.test(tip)
    ),
  ];

  const recommended_action = /guidance/i.test(item.recommended_action)
    ? item.recommended_action
    : `${item.recommended_action} Also seek the Guidance Office for counseling support and a guidance referral.`;

  return {
    ...item,
    recommended_action,
    tips,
  };
}

export function getFactorRecommendation(
  key: FactorKey,
  level: BurnoutLevel,
  options?: {
    trend?: string | null;
    thisWeek?: boolean;
    previousLevel?: BurnoutLevel | null;
    raw?: number | null;
    factors?: StudentFactors | null;
  }
): Omit<FactorRecommendation, "normalized"> {
  const item = FACTOR_TIPS[key][level] ?? FACTOR_TIPS[key].Low;
  const previousLevel = options?.previousLevel ?? null;
  const useHistoryHeadings =
    previousLevel != null || options?.thisWeek === false;
  const factorTrend = factorLevelTrend(level, previousLevel);
  const headed = withFactorTrendCopy(
    key,
    level,
    item,
    useHistoryHeadings ? options?.trend ?? factorTrend : null,
    previousLevel
  );
  const scored = enrichFactorWithScores(key, level, headed, {
    raw: options?.raw,
    factors: options?.factors,
  });
  return {
    key,
    level,
    factorTrend,
    ...withGuidanceReferral(scored, level),
  };
}

export function getFactorRecommendations(
  factors: StudentFactors | null | undefined,
  options?: {
    trend?: string | null;
    thisWeek?: boolean;
    previousFactors?: StudentFactors | null;
  }
): FactorRecommendation[] {
  if (!factors) return [];
  const previousFactors = options?.previousFactors ?? null;
  return FACTOR_ORDER.map((key) => {
    const normalized = factors[key]?.normalized ?? 0;
    const raw = factors[key]?.raw ?? null;
    const level = classifyFactorScore(normalized);
    const previousLevel = previousFactors
      ? classifyFactorScore(previousFactors[key]?.normalized ?? 0)
      : null;
    return {
      ...getFactorRecommendation(key, level, {
        trend: options?.trend,
        thisWeek: previousFactors ? false : options?.thisWeek,
        previousLevel,
        raw,
        factors,
      }),
      normalized,
    };
  }).sort((a, b) => b.normalized - a.normalized);
}

/**
 * Historical-based personalized counseling recommendation:
 * previous week + latest week → trend → outlook → per-factor actions.
 * First week (no real prior monitoring) ignores synthetic baseline trends
 * so copy does not sound like a prior week was monitored.
 */
export function buildPersonalizedCounselingRecommendation(input: {
  currentLevel: BurnoutLevel | null | undefined;
  nextWeekRisk?: BurnoutLevel | null;
  earlyWarningTrend?: string | null;
  currentMfbi?: number | null;
  previousMfbi?: number | null;
  factors?: StudentFactors | null;
  previousFactors?: StudentFactors | null;
}): CounselingRecommendation | null {
  const hasPriorWeek =
    (input.previousMfbi != null &&
      Number.isFinite(Number(input.previousMfbi))) ||
    input.previousFactors != null;

  const recommendationTrend = hasPriorWeek
    ? resolveRecommendationTrend(
        input.earlyWarningTrend,
        input.currentMfbi,
        input.previousMfbi
      )
    : null;

  const { level, basis, trend } = resolveRecommendationLevel(
    input.currentLevel,
    input.nextWeekRisk ?? null,
    { trend: recommendationTrend }
  );
  if (!level) return null;

  const overall = getOverallRecommendation(level, {
    trend: recommendationTrend,
    currentMfbi: input.currentMfbi ?? null,
    previousMfbi: hasPriorWeek ? input.previousMfbi ?? null : null,
  });
  if (!overall) return null;

  const factors = getFactorRecommendations(input.factors, {
    trend: recommendationTrend,
    thisWeek: !hasPriorWeek,
    previousFactors: hasPriorWeek ? input.previousFactors ?? null : null,
  });

  const topElevated = factors.filter((f) => f.level !== "Low").slice(0, 2);
  const focusNote =
    topElevated.length > 0
      ? ` This week, focus most on ${topElevated
          .map((f) => f.category.toLowerCase())
          .join(" and ")} based on your MFBI questionnaire scores.`
      : hasPriorWeek
        ? " Your factor scores look steady — keep the habits that are working."
        : " Keep checking stress, schoolwork, study time, and sleep each week.";

  return {
    title: overall.title,
    description: `${overall.description}${focusNote}`,
    recommended_action: overallActionFromFactors(
      overall.burnout_level,
      overall.recommended_action,
      factors
    ),
    burnout_level: overall.burnout_level,
    basis,
    trend,
    currentLevel: input.currentLevel ?? null,
    nextWeekRisk: input.nextWeekRisk ?? null,
    currentMfbi: input.currentMfbi ?? null,
    previousMfbi: hasPriorWeek ? input.previousMfbi ?? null : null,
    factors,
  };
}

/** All four factor tips at a single overall MFBI level (recommendations page fallback). */
export function getTipsForLevel(
  level: BurnoutLevel | null | undefined,
  options?: { trend?: string | null; thisWeek?: boolean }
): Tip[] {
  const resolved = level ?? "Low";
  const resolvedOptions = { thisWeek: true, ...options };
  return FACTOR_ORDER.map((key) => {
    const item = getFactorRecommendation(key, resolved, resolvedOptions);
    return {
      category: item.category,
      title: item.title,
      tips: item.tips,
    };
  });
}

export function getPersonalizedTips(
  factors: StudentFactors | null | undefined,
  fallbackLevel?: BurnoutLevel | null,
  options?: { trend?: string | null; previousFactors?: StudentFactors | null }
): Tip[] {
  const recs = getFactorRecommendations(factors, options);
  if (recs.length) {
    return recs.map((item) => ({
      category: item.category,
      title: item.title,
      tips: item.tips,
    }));
  }
  return getTipsForLevel(fallbackLevel, options);
}
