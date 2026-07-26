-- ============================================================
-- PHASE 6: Performance — indexes + RLS helpers
-- Run after phase1–phase5. Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ------------------------------------------------------------
-- Indexes: created_at + high-value composites
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_departments_created_at
  ON departments(created_at);

CREATE INDEX IF NOT EXISTS idx_academic_terms_created_at
  ON academic_terms(created_at);

CREATE INDEX IF NOT EXISTS idx_questionnaires_created_at
  ON questionnaires(created_at);

CREATE INDEX IF NOT EXISTS idx_questions_created_at
  ON questions(created_at);

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_created_at
  ON weekly_monitoring(created_at);

CREATE INDEX IF NOT EXISTS idx_mfbi_created_at
  ON mfbi_results(created_at);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_created_at
  ON ml_predictions(created_at);

CREATE INDEX IF NOT EXISTS idx_recommendations_created_at
  ON recommendations(created_at);

CREATE INDEX IF NOT EXISTS idx_counseling_created_at
  ON counseling_records(created_at);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON announcements(created_at);

CREATE INDEX IF NOT EXISTS idx_login_history_created_at
  ON login_history(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_term_week
  ON weekly_monitoring(term_id, week_number);

CREATE INDEX IF NOT EXISTS idx_profiles_dept_role
  ON profiles(department_id, role)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_student_created
  ON weekly_monitoring(student_id, created_at DESC);

-- Drop indexes that duplicate UNIQUE constraints (optional cleanup)
DROP INDEX IF EXISTS idx_profiles_student_number;
DROP INDEX IF EXISTS idx_profiles_employee_no;
DROP INDEX IF EXISTS idx_departments_code;
DROP INDEX IF EXISTS idx_departments_name;
DROP INDEX IF EXISTS idx_questionnaires_name;
DROP INDEX IF EXISTS idx_mfbi_monitoring;
DROP INDEX IF EXISTS idx_ml_predictions_mfbi;

-- ------------------------------------------------------------
-- RLS helpers (same security rules, less nested EXISTS per row)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = p_student_id
    OR public.current_user_role() = 'Guidance Counselor'
    OR (
      public.current_user_role() = 'Instructor'
      AND EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = p_student_id
          AND p.department_id = public.current_user_department_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_monitoring(p_monitoring_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM weekly_monitoring wm
    WHERE wm.monitoring_id = p_monitoring_id
      AND wm.student_id = auth.uid()
  );
$$;

-- Flatten SELECT policies (names match phase3)
DROP POLICY IF EXISTS "Read weekly monitoring by role/department" ON weekly_monitoring;
DROP POLICY IF EXISTS "Staff read weekly monitoring" ON weekly_monitoring;
CREATE POLICY "Read weekly monitoring by role/department"
ON weekly_monitoring FOR SELECT
TO authenticated
USING (public.can_access_student(student_id));

DROP POLICY IF EXISTS "Read monitoring answers by role/department" ON weekly_monitoring_answers;
DROP POLICY IF EXISTS "Staff read monitoring answers" ON weekly_monitoring_answers;
CREATE POLICY "Read monitoring answers by role/department"
ON weekly_monitoring_answers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM weekly_monitoring wm
    WHERE wm.monitoring_id = weekly_monitoring_answers.monitoring_id
      AND public.can_access_student(wm.student_id)
  )
);

DROP POLICY IF EXISTS "Read mfbi by role/department" ON mfbi_results;
DROP POLICY IF EXISTS "Staff read mfbi results" ON mfbi_results;
CREATE POLICY "Read mfbi by role/department"
ON mfbi_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM weekly_monitoring wm
    WHERE wm.monitoring_id = mfbi_results.monitoring_id
      AND public.can_access_student(wm.student_id)
  )
);

DROP POLICY IF EXISTS "Read ml predictions by role/department" ON ml_predictions;
DROP POLICY IF EXISTS "Staff read ml predictions" ON ml_predictions;
CREATE POLICY "Read ml predictions by role/department"
ON ml_predictions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM mfbi_results mr
    JOIN weekly_monitoring wm ON wm.monitoring_id = mr.monitoring_id
    WHERE mr.mfbi_id = ml_predictions.mfbi_id
      AND public.can_access_student(wm.student_id)
  )
);

-- Student INSERT ownership helpers
DROP POLICY IF EXISTS "Students insert own monitoring answers" ON weekly_monitoring_answers;
CREATE POLICY "Students insert own monitoring answers"
ON weekly_monitoring_answers FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'Student'
  AND public.owns_monitoring(monitoring_id)
);

DROP POLICY IF EXISTS "Students insert own mfbi results" ON mfbi_results;
CREATE POLICY "Students insert own mfbi results"
ON mfbi_results FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'Student'
  AND public.owns_monitoring(monitoring_id)
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
    WHERE mr.mfbi_id = ml_predictions.mfbi_id
      AND public.owns_monitoring(mr.monitoring_id)
  )
);
