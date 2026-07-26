-- ============================================================
-- PHASE 3: Instructor module RLS (department-scoped)
-- Run after bd.sql, phase1-auth.sql, phase2-student.sql
-- ============================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_monitoring_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfbi_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Announcement reads
DROP POLICY IF EXISTS "Authenticated read announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated read published announcements" ON announcements;
CREATE POLICY "Authenticated read announcements"
ON announcements FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.current_user_role() = 'Guidance Counselor'
  OR (
    is_active = TRUE
    AND (
      department_id IS NULL
      OR department_id = public.current_user_department_id()
      OR public.current_user_role() = 'Student'
    )
  )
);

DROP POLICY IF EXISTS "Instructors manage own announcements" ON announcements;
DROP POLICY IF EXISTS "Instructors insert announcements" ON announcements;
DROP POLICY IF EXISTS "Instructors update own announcements" ON announcements;
DROP POLICY IF EXISTS "Instructors delete own announcements" ON announcements;

CREATE POLICY "Instructors insert announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.current_user_role() IN ('Instructor', 'Guidance Counselor')
);

CREATE POLICY "Instructors update own announcements"
ON announcements FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND public.current_user_role() IN ('Instructor', 'Guidance Counselor')
)
WITH CHECK (
  created_by = auth.uid()
  AND public.current_user_role() IN ('Instructor', 'Guidance Counselor')
);

CREATE POLICY "Instructors delete own announcements"
ON announcements FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND public.current_user_role() IN ('Instructor', 'Guidance Counselor')
);

-- Instructor department-scoped monitoring reads
DROP POLICY IF EXISTS "Students read own weekly monitoring" ON weekly_monitoring;
DROP POLICY IF EXISTS "Staff read weekly monitoring" ON weekly_monitoring;
CREATE POLICY "Read weekly monitoring by role/department"
ON weekly_monitoring FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
  OR public.current_user_role() = 'Guidance Counselor'
  OR (
    public.current_user_role() = 'Instructor'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = weekly_monitoring.student_id
        AND p.department_id = public.current_user_department_id()
    )
  )
);

DROP POLICY IF EXISTS "Students read own monitoring answers" ON weekly_monitoring_answers;
CREATE POLICY "Read monitoring answers by role/department"
ON weekly_monitoring_answers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM weekly_monitoring wm
    WHERE wm.monitoring_id = weekly_monitoring_answers.monitoring_id
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

DROP POLICY IF EXISTS "Students read own mfbi results" ON mfbi_results;
DROP POLICY IF EXISTS "Staff read mfbi results" ON mfbi_results;
CREATE POLICY "Read mfbi by role/department"
ON mfbi_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM weekly_monitoring wm
    WHERE wm.monitoring_id = mfbi_results.monitoring_id
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

DROP POLICY IF EXISTS "Students read own ml predictions" ON ml_predictions;
CREATE POLICY "Read ml predictions by role/department"
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
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
