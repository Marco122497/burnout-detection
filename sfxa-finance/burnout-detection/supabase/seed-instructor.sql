-- ============================================================
-- SEED: Instructor login account (Supabase Auth + profiles)
-- Run in Supabase SQL Editor after bd.sql + phase1-auth.sql
-- ============================================================
-- Login credentials:
--   Email:    instructor@school.edu
--   Password: Instructor123!
-- Department: Computer Science (CS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := '11111111-1111-1111-1111-111111111111';
  v_department_id bigint;
BEGIN
  SELECT department_id
  INTO v_department_id
  FROM public.departments
  WHERE department_code = 'CS'
  LIMIT 1;

  IF v_department_id IS NULL THEN
    RAISE EXCEPTION 'CS department not found. Run bd.sql sample departments first.';
  END IF;

  -- Auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    is_sso_user,
    is_anonymous
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'instructor@school.edu',
    crypt('Instructor123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'Instructor',
      'first_name', 'Maria',
      'middle_name', 'Santos',
      'last_name', 'Reyes',
      'employee_no', 'EMP-INS-001',
      'designation', 'Instructor',
      'department_id', v_department_id
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    FALSE,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

  -- Required for email/password login in newer Supabase projects
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', 'instructor@school.edu',
      'email_verified', true
    ),
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  -- Ensure profile fields (trigger may already create the row)
  INSERT INTO public.profiles (
    id,
    role,
    employee_no,
    first_name,
    middle_name,
    last_name,
    designation,
    department_id,
    is_active,
    is_verified
  )
  VALUES (
    v_user_id,
    'Instructor',
    'EMP-INS-001',
    'Maria',
    'Santos',
    'Reyes',
    'Instructor',
    v_department_id,
    TRUE,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'Instructor',
    employee_no = EXCLUDED.employee_no,
    first_name = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    last_name = EXCLUDED.last_name,
    designation = EXCLUDED.designation,
    department_id = EXCLUDED.department_id,
    is_active = TRUE,
    is_verified = TRUE;
END $$;
