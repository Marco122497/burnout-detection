-- ST1: weekly-hour numeric values for MFBI (not daily)
UPDATE questions q
SET scale_options = '[
  {"value": 1, "label": "Less than 5 hours", "numeric_value": 2.5},
  {"value": 2, "label": "5–10 hours", "numeric_value": 7.5},
  {"value": 3, "label": "11–15 hours", "numeric_value": 13},
  {"value": 4, "label": "16–20 hours", "numeric_value": 18},
  {"value": 5, "label": "More than 20 hours", "numeric_value": 25}
]'::jsonb
FROM questionnaires qn
WHERE q.questionnaire_id = qn.questionnaire_id
  AND qn.questionnaire_name = 'Study Time'
  AND q.question_order = 1
  AND q.is_active = true;

-- Legacy rows stored daily hours (e.g. 2.57) — convert to weekly
UPDATE weekly_monitoring
SET study_time_score = ROUND((study_time_score * 7)::numeric, 2)
WHERE study_time_score IS NOT NULL
  AND study_time_score <= 6;

-- Recalculate MFBI study normalization (÷ 25 weekly hours max)
UPDATE mfbi_results m
SET
  normalized_study_time = LEAST(1, w.study_time_score / 25.0),
  mfbi_score = ROUND(
    (
      m.normalized_stress
      + m.normalized_academic_workload
      + LEAST(1, w.study_time_score / 25.0)
      + m.normalized_sleep_hours
    ) / 4.0,
    4
  ),
  burnout_risk_level = CASE
    WHEN (
      m.normalized_stress
      + m.normalized_academic_workload
      + LEAST(1, w.study_time_score / 25.0)
      + m.normalized_sleep_hours
    ) / 4.0 <= 0.39 THEN 'Low'
    WHEN (
      m.normalized_stress
      + m.normalized_academic_workload
      + LEAST(1, w.study_time_score / 25.0)
      + m.normalized_sleep_hours
    ) / 4.0 <= 0.69 THEN 'Moderate'
    ELSE 'High'
  END
FROM weekly_monitoring w
WHERE m.monitoring_id = w.monitoring_id
  AND w.study_time_score IS NOT NULL;
