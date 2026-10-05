-- Instructors can see weekly scores, but not each questionnaire answer.
-- Run in the Supabase SQL editor.

DROP POLICY IF EXISTS "Read monitoring answers by role/department" ON public.weekly_monitoring_answers;
DROP POLICY IF EXISTS "Staff read monitoring answers" ON public.weekly_monitoring_answers;

CREATE POLICY "Read monitoring answers by role/department"
ON public.weekly_monitoring_answers
FOR SELECT
TO authenticated
USING (
  public.current_user_role() <> 'Instructor'
  AND EXISTS (
    SELECT 1
    FROM public.weekly_monitoring wm
    WHERE wm.monitoring_id = weekly_monitoring_answers.monitoring_id
      AND public.can_access_student(wm.student_id)
  )
);
