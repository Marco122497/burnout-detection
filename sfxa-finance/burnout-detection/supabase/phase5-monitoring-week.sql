-- ============================================================
-- PHASE 5: Guidance-controlled weekly monitoring week
-- Run after phase1–phase4 SQL
-- ============================================================

ALTER TABLE academic_terms
ADD COLUMN IF NOT EXISTS monitoring_week INTEGER NOT NULL DEFAULT 1
  CHECK (monitoring_week >= 1);

ALTER TABLE academic_terms
ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "Guidance manage academic terms" ON academic_terms;
CREATE POLICY "Guidance manage academic terms"
ON academic_terms FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

-- Guidance may insert notifications for students when opening a week.
DROP POLICY IF EXISTS "Guidance insert notifications" ON notifications;
CREATE POLICY "Guidance insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() = 'Guidance Counselor');
