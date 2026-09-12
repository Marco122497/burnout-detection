import type { createClient } from "@/lib/supabase/server";
import type { BurnoutLevel } from "@/lib/student/mfbi";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

export type RagRecommendationPayload = {
  assessment_summary: string;
  contributing_factors: string[];
  recommended_actions: string[];
  human_support: string;
  sources: string[];
};

export type RagRecommendationAudit = {
  llm_model: string | null;
  used_fallback: boolean;
  fallback_reason: string | null;
  retrieved_categories: string[];
  retrieved_chunks: {
    id?: number;
    title?: string;
    category?: string;
    source?: string;
    chunk_number?: number;
    similarity?: number;
  }[];
  factor_labels: Record<string, string>;
};

export type RagRecommendationResult = {
  mfbi_score: number;
  risk_level: BurnoutLevel | string;
  prediction_model: string;
  recommendation: RagRecommendationPayload;
  audit: RagRecommendationAudit;
};

export type StoredRagRecommendation = RagRecommendationPayload & {
  id: number;
  monitoring_id: number | null;
  mfbi_score: number | null;
  risk_level: string | null;
  prediction_model: string | null;
  llm_model: string | null;
  used_fallback: boolean;
  retrieved_categories: string[];
  created_at: string;
};

type RecommendationResponse = {
  success?: boolean;
  mfbi_score?: number;
  risk_level?: string;
  prediction_model?: string;
  recommendation?: RagRecommendationPayload;
  audit?: Partial<RagRecommendationAudit>;
  message?: string;
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter((item) => item.trim().length > 0);
}

export async function saveRagRecommendation(
  supabase: SupabaseLike,
  input: {
    studentId: string;
    monitoringId: number;
    mfbiId?: number | null;
    predictionId?: number | null;
    result: RagRecommendationResult;
  }
) {
  const row = {
    student_id: input.studentId,
    monitoring_id: input.monitoringId,
    mfbi_id: input.mfbiId ?? null,
    prediction_id: input.predictionId ?? null,
    mfbi_score: input.result.mfbi_score,
    risk_level: input.result.risk_level,
    prediction_model: input.result.prediction_model,
    llm_model: input.result.audit.llm_model,
    used_fallback: input.result.audit.used_fallback,
    assessment_summary: input.result.recommendation.assessment_summary,
    contributing_factors: input.result.recommendation.contributing_factors,
    recommended_actions: input.result.recommendation.recommended_actions,
    human_support: input.result.recommendation.human_support,
    sources: input.result.recommendation.sources,
    retrieved_categories: input.result.audit.retrieved_categories,
    retrieved_chunks: input.result.audit.retrieved_chunks,
    recommendation_text: [
      input.result.recommendation.assessment_summary,
      input.result.recommendation.recommended_actions.join("\n"),
      input.result.recommendation.human_support,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };

  const { data: existing } = await supabase
    .from("rag_recommendations")
    .select("id")
    .eq("monitoring_id", input.monitoringId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("rag_recommendations")
      .update(row)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("rag_recommendations").insert(row);
  if (error) throw new Error(error.message);
}

export function mapStoredRagRecommendation(
  row: Record<string, unknown> | null | undefined
): StoredRagRecommendation | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    monitoring_id: row.monitoring_id != null ? Number(row.monitoring_id) : null,
    mfbi_score: row.mfbi_score != null ? Number(row.mfbi_score) : null,
    risk_level: row.risk_level != null ? String(row.risk_level) : null,
    prediction_model: row.prediction_model != null ? String(row.prediction_model) : null,
    llm_model: row.llm_model != null ? String(row.llm_model) : null,
    used_fallback: Boolean(row.used_fallback),
    assessment_summary: String(row.assessment_summary ?? ""),
    contributing_factors: asStringList(row.contributing_factors),
    recommended_actions: asStringList(row.recommended_actions),
    human_support: String(row.human_support ?? ""),
    sources: asStringList(row.sources),
    retrieved_categories: asStringList(row.retrieved_categories),
    created_at: String(row.created_at ?? ""),
  };
}

export function parseRecommendationResponse(
  data: RecommendationResponse
): RagRecommendationResult | null {
  if (!data.recommendation?.assessment_summary) return null;
  return {
    mfbi_score: Number(data.mfbi_score ?? 0),
    risk_level: data.risk_level ?? "Moderate",
    prediction_model: data.prediction_model ?? "Random Forest",
    recommendation: {
      assessment_summary: data.recommendation.assessment_summary,
      contributing_factors: asStringList(data.recommendation.contributing_factors),
      recommended_actions: asStringList(data.recommendation.recommended_actions),
      human_support: data.recommendation.human_support ?? "",
      sources: asStringList(data.recommendation.sources),
    },
    audit: {
      llm_model: data.audit?.llm_model ?? null,
      used_fallback: Boolean(data.audit?.used_fallback),
      fallback_reason: data.audit?.fallback_reason ?? null,
      retrieved_categories: asStringList(data.audit?.retrieved_categories),
      retrieved_chunks: Array.isArray(data.audit?.retrieved_chunks)
        ? data.audit.retrieved_chunks
        : [],
      factor_labels: data.audit?.factor_labels ?? {},
    },
  };
}
