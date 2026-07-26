-- ============================================================
-- PHASE 1: Auth helpers, departments RLS, guidance policies
-- Run after bd.sql in the Supabase SQL editor
-- ============================================================

-- Auto-create profile when a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := COALESCE(meta->>'first_name', 'New');
  v_middle text := NULLIF(meta->>'middle_name', '');
  v_last text := COALESCE(meta->>'last_name', 'User');
  v_suffix text := NULLIF(meta->>'suffix', '');
  v_role text := COALESCE(meta->>'role', 'Student');
  v_department_id bigint;
BEGIN
  IF v_role NOT IN ('Student', 'Instructor', 'Guidance Counselor') THEN
    v_role := 'Student';
  END IF;

  BEGIN
    v_department_id := NULLIF(meta->>'department_id', '')::bigint;
  EXCEPTION WHEN others THEN
    v_department_id := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    employee_no,
    student_number,
    first_name,
    middle_name,
    last_name,
    suffix,
    role,
    course,
    year_level,
    section,
    designation,
    department_id,
    is_active
  )
  VALUES (
    NEW.id,
    NULLIF(meta->>'employee_no', ''),
    NULLIF(meta->>'student_number', ''),
    v_first,
    v_middle,
    v_last,
    v_suffix,
    v_role,
    NULLIF(meta->>'course', ''),
    NULLIF(meta->>'year_level', '')::integer,
    NULLIF(meta->>'section', ''),
    NULLIF(meta->>'designation', ''),
    v_department_id,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Helpers
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_department_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- RLS: profiles
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Staff can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Guidance can view all profiles" ON profiles;
CREATE POLICY "Guidance can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Guidance can update instructor profiles" ON profiles;
CREATE POLICY "Guidance can update instructor profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'Guidance Counselor'
  AND role = 'Instructor'
)
WITH CHECK (
  public.current_user_role() = 'Guidance Counselor'
  AND role = 'Instructor'
);

DROP POLICY IF EXISTS "Instructor can view department students" ON profiles;
CREATE POLICY "Instructor can view department students"
ON profiles FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'Instructor'
  AND role = 'Student'
  AND department_id IS NOT NULL
  AND department_id = public.current_user_department_id()
);

-- ============================================================
-- RLS: departments
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active departments" ON departments;
CREATE POLICY "Anyone can read active departments"
ON departments FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Guidance can read all departments" ON departments;
CREATE POLICY "Guidance can read all departments"
ON departments FOR SELECT
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Guidance can insert departments" ON departments;
CREATE POLICY "Guidance can insert departments"
ON departments FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Guidance can update departments" ON departments;
CREATE POLICY "Guidance can update departments"
ON departments FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

-- ============================================================
-- RLS: announcements / recommendations (read)
-- ============================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read announcements" ON announcements;
CREATE POLICY "Authenticated read announcements"
ON announcements FOR SELECT
TO authenticated
USING (is_active = TRUE OR created_by = auth.uid() OR public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Instructors manage own announcements" ON announcements;
CREATE POLICY "Instructors manage own announcements"
ON announcements FOR ALL
TO authenticated
USING (
  created_by = auth.uid()
  AND public.current_user_role() IN ('Instructor', 'Guidance Counselor')
)
WITH CHECK (
  created_by = auth.uid()
  AND public.current_user_role() IN ('Instructor', 'Guidance Counselor')
);

DROP POLICY IF EXISTS "Authenticated read recommendations" ON recommendations;
CREATE POLICY "Authenticated read recommendations"
ON recommendations FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- RLS: weekly monitoring / mfbi (students own + staff department)
-- ============================================================

ALTER TABLE weekly_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_monitoring_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfbi_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own weekly monitoring" ON weekly_monitoring;
CREATE POLICY "Students read own weekly monitoring"
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
CREATE POLICY "Students read own monitoring answers"
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
CREATE POLICY "Students read own mfbi results"
ON mfbi_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM weekly_monitoring wm
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

-- ============================================================
-- RLS: login_history & audit_logs
-- ============================================================

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own login history" ON login_history;
CREATE POLICY "Users insert own login history"
ON login_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own login history" ON login_history;
CREATE POLICY "Users update own login history"
ON login_history FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own login history" ON login_history;
CREATE POLICY "Users view own login history"
ON login_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own audit logs" ON audit_logs;
CREATE POLICY "Users insert own audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own audit logs" ON audit_logs;
CREATE POLICY "Users view own audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read academic terms" ON academic_terms;
CREATE POLICY "Authenticated read academic terms"
ON academic_terms FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- Storage: avatars bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
