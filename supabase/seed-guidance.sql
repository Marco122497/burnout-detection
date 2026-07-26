-- ============================================================
-- SEED: Guidance Counselor login account (Supabase Auth + profiles)
-- Run in Supabase SQL Editor after bd.sql + phase1-auth.sql
-- ============================================================
-- Login credentials:
--   Email:    guidance@school.edu
--   Password: Guidance123!
-- Role:       Guidance Counselor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
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
    'guidance@school.edu',
    crypt('Guidance123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'Guidance Counselor',
      'first_name', 'Ana',
      'middle_name', 'Cruz',
      'last_name', 'Dela Cruz',
      'employee_no', 'EMP-GC-001',
      'designation', 'Guidance Counselor'
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
      'email', 'guidance@school.edu',
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
    'Guidance Counselor',
    'EMP-GC-001',
    'Ana',
    'Cruz',
    'Dela Cruz',
    'Guidance Counselor',
    NULL,
    TRUE,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'Guidance Counselor',
    employee_no = EXCLUDED.employee_no,
    first_name = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    last_name = EXCLUDED.last_name,
    designation = EXCLUDED.designation,
    department_id = NULL,
    is_active = TRUE,
    is_verified = TRUE;
END $$;
