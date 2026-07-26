-- ============================================================
-- PHASE 2: Student weekly monitoring, questions seed, RLS
-- Run after bd.sql and supabase/phase1-auth.sql
-- ============================================================

-- ------------------------------------------------------------
-- Seed PSS-10 questions (Likert 1–5; reverse_scored marked)
-- ------------------------------------------------------------

INSERT INTO questions (
  questionnaire_id,
  question_text,
  question_order,
  response_type,
  reverse_scored,
  is_required,
  is_active
)
SELECT q.questionnaire_id, v.question_text, v.question_order, 'Likert Scale', v.reverse_scored, TRUE, TRUE
FROM questionnaires q
CROSS JOIN (
  VALUES
    (1, 'In the last month, how often have you been upset because of something that happened unexpectedly?', FALSE),
    (2, 'In the last month, how often have you felt that you were unable to control the important things in your life?', FALSE),
    (3, 'In the last month, how often have you felt nervous and stressed?', FALSE),
    (4, 'In the last month, how often have you felt confident about your ability to handle your personal problems?', TRUE),
    (5, 'In the last month, how often have you felt that things were going your way?', TRUE),
    (6, 'In the last month, how often have you found that you could not cope with all the things that you had to do?', FALSE),
    (7, 'In the last month, how often have you been able to control irritations in your life?', TRUE),
    (8, 'In the last month, how often have you felt that you were on top of things?', TRUE),
    (9, 'In the last month, how often have you been angered because of things that happened that were outside of your control?', FALSE),
    (10, 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?', FALSE)
) AS v(question_order, question_text, reverse_scored)
WHERE q.questionnaire_name = 'Perceived Stress Scale (PSS-10)'
ON CONFLICT (questionnaire_id, question_order) DO UPDATE
SET
  question_text = EXCLUDED.question_text,
  reverse_scored = EXCLUDED.reverse_scored,
  response_type = EXCLUDED.response_type,
  is_active = TRUE;

UPDATE questionnaires
SET
  total_questions = 10,
  description = 'PSS-10 stress assessment for the last month. Response scale: 0 Never, 1 Almost Never, 2 Sometimes, 3 Fairly Often, 4 Very Often. Reverse-scored items: 4, 5, 7, and 8. Total score 0–40 (0–13 Low, 14–26 Moderate, 27–40 High).'
WHERE questionnaire_name = 'Perceived Stress Scale (PSS-10)';

-- ------------------------------------------------------------
-- Academic Workload (Likert 1–5)
-- ------------------------------------------------------------

INSERT INTO questions (
  questionnaire_id,
  question_text,
  question_order,
  response_type,
  reverse_scored,
  is_required,
  is_active
)
SELECT q.questionnaire_id, v.question_text, v.question_order, 'Likert Scale', FALSE, TRUE, TRUE
FROM questionnaires q
CROSS JOIN (
  VALUES
    (1, 'How heavy is your current academic workload this week?'),
    (2, 'How often do overlapping deadlines make your workload hard to manage?'),
    (3, 'How often do assignments require more time than you expected?'),
    (4, 'How often do you feel pressured by the volume of academic requirements?'),
    (5, 'How difficult is it to keep up with quizzes, projects, and readings this week?')
) AS v(question_order, question_text)
WHERE q.questionnaire_name = 'Academic Workload'
ON CONFLICT (questionnaire_id, question_order) DO UPDATE
SET
  question_text = EXCLUDED.question_text,
  is_active = TRUE;

UPDATE questionnaires
SET
  total_questions = 5,
  description = '5-point Likert scale (1 = Definitely Disagree, 5 = Definitely Agree).'
WHERE questionnaire_name = 'Academic Workload';

-- ------------------------------------------------------------
-- Study Time (hours per day, scores 1–5)
-- ------------------------------------------------------------

INSERT INTO questions (
  questionnaire_id,
  question_text,
  question_order,
  response_type,
  reverse_scored,
  is_required,
  is_active
)
SELECT q.questionnaire_id, v.question_text, v.question_order, 'Hours', FALSE, TRUE, TRUE
FROM questionnaires q
CROSS JOIN (
  VALUES
    (1, 'On average, how many hours per day did you study this week?'),
    (2, 'How many hours per day did you spend on assignments and projects this week?'),
    (3, 'How many hours per day did you spend reviewing lessons this week?'),
    (4, 'How many hours per day did you spend on focused study sessions this week?')
) AS v(question_order, question_text)
WHERE q.questionnaire_name = 'Study Time'
ON CONFLICT (questionnaire_id, question_order) DO UPDATE
SET
  question_text = EXCLUDED.question_text,
  response_type = EXCLUDED.response_type,
  is_active = TRUE;

UPDATE questionnaires
SET
  total_questions = 4,
  description = 'Response scale: 1 = Less than 1 hour/day, 2 = 1–2 hours/day, 3 = 3–4 hours/day, 4 = 5–6 hours/day, 5 = More than 6 hours/day.'
WHERE questionnaire_name = 'Study Time';

-- ------------------------------------------------------------
-- Sleep Hours (Hours mapped to 1–5 buckets)
-- ------------------------------------------------------------

INSERT INTO questions (
  questionnaire_id,
  question_text,
  question_order,
  response_type,
  reverse_scored,
  is_required,
  is_active
)
SELECT q.questionnaire_id, v.question_text, v.question_order, 'Hours', FALSE, TRUE, TRUE
FROM questionnaires q
CROSS JOIN (
  VALUES
    (1, 'On average, how many hours did you sleep per night this week? (1=<5h, 2=5–6h, 3=6–7h, 4=7–8h, 5=>8h)'),
    (2, 'How consistent was your sleep schedule this week? (1=Very inconsistent … 5=Very consistent)'),
    (3, 'How rested did you feel upon waking? (1=Not rested … 5=Fully rested)'),
    (4, 'How often did lack of sleep affect your academics this week? (1=Never … 5=Very often)')
) AS v(question_order, question_text)
WHERE q.questionnaire_name = 'Sleep Hours'
ON CONFLICT (questionnaire_id, question_order) DO UPDATE
SET
  question_text = EXCLUDED.question_text,
  response_type = EXCLUDED.response_type,
  is_active = TRUE;

-- Q4 for sleep is risk-increasing when high; mark reverse for restedness? 
-- For scoring we treat Q4 as risk item (higher = worse sleep impact).
UPDATE questionnaires
SET total_questions = 4
WHERE questionnaire_name = 'Sleep Hours';

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_monitoring_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfbi_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read academic terms" ON academic_terms;
CREATE POLICY "Authenticated read academic terms"
ON academic_terms FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated read questionnaires" ON questionnaires;
CREATE POLICY "Authenticated read questionnaires"
ON questionnaires FOR SELECT
TO authenticated
USING (is_active = TRUE OR public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Authenticated read questions" ON questions;
CREATE POLICY "Authenticated read questions"
ON questions FOR SELECT
TO authenticated
USING (is_active = TRUE OR public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Students insert own weekly monitoring" ON weekly_monitoring;
CREATE POLICY "Students insert own weekly monitoring"
ON weekly_monitoring FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND public.current_user_role() = 'Student'
);

DROP POLICY IF EXISTS "Students update own weekly monitoring" ON weekly_monitoring;
CREATE POLICY "Students update own weekly monitoring"
ON weekly_monitoring FOR UPDATE
TO authenticated
USING (
  auth.uid() = student_id
  AND public.current_user_role() = 'Student'
)
WITH CHECK (
  auth.uid() = student_id
  AND public.current_user_role() = 'Student'
);

DROP POLICY IF EXISTS "Students insert own monitoring answers" ON weekly_monitoring_answers;
CREATE POLICY "Students insert own monitoring answers"
ON weekly_monitoring_answers FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'Student'
  AND EXISTS (
    SELECT 1 FROM weekly_monitoring wm
    WHERE wm.monitoring_id = weekly_monitoring_answers.monitoring_id
      AND wm.student_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students insert own mfbi results" ON mfbi_results;
CREATE POLICY "Students insert own mfbi results"
ON mfbi_results FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'Student'
  AND EXISTS (
    SELECT 1 FROM weekly_monitoring wm
    WHERE wm.monitoring_id = mfbi_results.monitoring_id
      AND wm.student_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students insert own ml predictions" ON ml_predictions;
CREATE POLICY "Students insert own ml predictions"
ON ml_predictions FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'Student'
  AND EXISTS (
    SELECT 1
    FROM mfbi_results mr
    JOIN weekly_monitoring wm ON wm.monitoring_id = mr.monitoring_id
    WHERE mr.mfbi_id = ml_predictions.mfbi_id
      AND wm.student_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students read own ml predictions" ON ml_predictions;
CREATE POLICY "Students read own ml predictions"
ON ml_predictions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM mfbi_results mr
    JOIN weekly_monitoring wm ON wm.monitoring_id = mr.monitoring_id
    WHERE mr.mfbi_id = ml_predictions.mfbi_id
      AND (
        wm.student_id = auth.uid()
        OR public.current_user_role() = 'Guidance Counselor'
        OR (
          public.current_user_role() = 'Instructor'
          AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = wm.student_id
              AND p.department_id = public.current_user_department_id()
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notifications" ON notifications;
CREATE POLICY "Users insert own notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read recommendations" ON recommendations;
CREATE POLICY "Authenticated read recommendations"
ON recommendations FOR SELECT
TO authenticated
USING (is_active = TRUE OR public.current_user_role() = 'Guidance Counselor');
