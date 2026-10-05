-- Extra college / program / department assignments for instructors.
-- Run in the Supabase SQL editor after the earlier phase scripts.

CREATE TABLE IF NOT EXISTS public.instructor_departments (
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id bigint NOT NULL REFERENCES public.departments(department_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instructor_id, department_id)
);

ALTER TABLE public.instructor_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guidance manages instructor departments" ON public.instructor_departments;
CREATE POLICY "Guidance manages instructor departments"
ON public.instructor_departments
FOR ALL
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Instructors read own departments" ON public.instructor_departments;
CREATE POLICY "Instructors read own departments"
ON public.instructor_departments
FOR SELECT
TO authenticated
USING (instructor_id = auth.uid());

INSERT INTO public.instructor_departments (instructor_id, department_id)
SELECT id, department_id
FROM public.profiles
WHERE role = 'Instructor'
  AND department_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.instructor_covers_department(target bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target IS NOT NULL AND (
    target = public.current_user_department_id()
    OR EXISTS (
      SELECT 1
      FROM public.instructor_departments d
      WHERE d.instructor_id = auth.uid()
        AND d.department_id = target
    )
  );
$$;

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
          AND public.instructor_covers_department(p.department_id)
      )
    );
$$;

DROP POLICY IF EXISTS "Instructor can view department students" ON profiles;
CREATE POLICY "Instructor can view department students"
ON profiles FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'Instructor'
  AND role = 'Student'
  AND public.instructor_covers_department(department_id)
);
