-- Fix Study Time order-2 question scale (ST2 frequency, not weekly hours)
UPDATE questions q
SET scale_options = '[
  {"value": 1, "label": "Never"},
  {"value": 2, "label": "Sometimes"},
  {"value": 3, "label": "Often"},
  {"value": 4, "label": "Very Often"}
]'::jsonb
FROM questionnaires qn
WHERE q.questionnaire_id = qn.questionnaire_id
  AND qn.questionnaire_name = 'Study Time'
  AND q.question_order = 2
  AND q.is_active = true;
