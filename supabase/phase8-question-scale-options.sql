-- Custom response choices per question (Likert / Hours scales)
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS scale_options JSONB;

COMMENT ON COLUMN questions.scale_options IS
  'Array of { "value": number, "label": string, "numeric_value"?: number } for student form choices.';
