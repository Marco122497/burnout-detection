-- ============================================================
-- PHASE 4: Guidance Counselor questionnaire settings + RLS
-- Run after phase1–phase3 SQL
-- ============================================================

ALTER TABLE questionnaires
ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

ALTER TABLE questionnaires
DROP CONSTRAINT IF EXISTS chk_questionnaire_availability;

ALTER TABLE questionnaires
ADD CONSTRAINT chk_questionnaire_availability
CHECK (
  available_until IS NULL
  OR available_from IS NULL
  OR available_until >= available_from
);

ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read questionnaires" ON questionnaires;
CREATE POLICY "Authenticated read questionnaires"
ON questionnaires FOR SELECT
TO authenticated
USING (
  is_active = TRUE
  OR public.current_user_role() = 'Guidance Counselor'
);

DROP POLICY IF EXISTS "Guidance manage questionnaires" ON questionnaires;
CREATE POLICY "Guidance manage questionnaires"
ON questionnaires FOR ALL
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Authenticated read questions" ON questions;
CREATE POLICY "Authenticated read questions"
ON questions FOR SELECT
TO authenticated
USING (
  is_active = TRUE
  OR public.current_user_role() = 'Guidance Counselor'
);

DROP POLICY IF EXISTS "Guidance manage questions" ON questions;
CREATE POLICY "Guidance manage questions"
ON questions FOR ALL
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

-- Guidance can manage all announcements (university-wide targeting).
-- Phase 1 already allows Guidance on own announcements; this keeps it explicit.
DROP POLICY IF EXISTS "Guidance manage announcements" ON announcements;
CREATE POLICY "Guidance manage announcements"
ON announcements FOR ALL
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (
  public.current_user_role() = 'Guidance Counselor'
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Guidance can delete departments" ON departments;
CREATE POLICY "Guidance can delete departments"
ON departments FOR DELETE
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor');

UPDATE questionnaires
SET description = 'PSS-10 stress assessment for the last month. Response scale: 0 Never, 1 Almost Never, 2 Sometimes, 3 Fairly Often, 4 Very Often. Reverse-scored items: 4, 5, 7, and 8. Total score 0–40 (0–13 Low, 14–26 Moderate, 27–40 High).'
WHERE questionnaire_name = 'Perceived Stress Scale (PSS-10)';

UPDATE questions q
SET question_text = 'In the last month, how often have you been angered because of things that happened that were outside of your control?'
FROM questionnaires qq
WHERE q.questionnaire_id = qq.questionnaire_id
  AND qq.questionnaire_name = 'Perceived Stress Scale (PSS-10)'
  AND q.question_order = 9;
