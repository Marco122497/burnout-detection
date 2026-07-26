-- SFXA Finance — Database Schema
-- Run in Supabase SQL Editor (PostgreSQL)

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    employee_no VARCHAR(30) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(20),
    full_name VARCHAR(150) NOT NULL,

    sex VARCHAR(10) CHECK (sex IN ('Male', 'Female')),
    birth_date DATE,
    contact_number VARCHAR(20),
    address TEXT,
    profile_picture TEXT,

    role VARCHAR(30) NOT NULL
        CHECK (role IN ('Administrator', 'Treasurer', 'Parish Officer')),
    status BOOLEAN DEFAULT TRUE,

    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe migration for existing databases that already have a slim profiles table
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS employee_no VARCHAR(30),
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS suffix VARCHAR(20),
    ADD COLUMN IF NOT EXISTS sex VARCHAR(10),
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS profile_picture TEXT,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_employee_no_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_employee_no_key UNIQUE (employee_no);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_sex_check'
    ) THEN
        ALTER TABLE profiles
            ADD CONSTRAINT profiles_sex_check CHECK (sex IS NULL OR sex IN ('Male', 'Female'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_profiles_updated_at();

-- ============================================================
-- LOGIN HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS login_history (
    login_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    login_time TIMESTAMPTZ DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    ip_address VARCHAR(100),
    device_info TEXT
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(100),
    table_name VARCHAR(100),
    record_id BIGINT,
    description TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
    announcement_id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS donation_categories (
    category_id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO donation_categories (category_name)
VALUES
    ('Sunday Collection'),
    ('Fiesta Collection'),
    ('Special Collection'),
    ('Other Collection')
ON CONFLICT (category_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS donations (
    donation_id BIGSERIAL PRIMARY KEY,
    donor_name VARCHAR(150),
    category_id BIGINT REFERENCES donation_categories(category_id),
    amount NUMERIC(12, 2) NOT NULL,
    donation_date DATE NOT NULL,
    remarks TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_categories (
    expense_category_id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO expense_categories (category_name)
VALUES
    ('Utilities'),
    ('Maintenance'),
    ('Charity'),
    ('Office Supplies'),
    ('Events'),
    ('Others')
ON CONFLICT (category_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
    expense_id BIGSERIAL PRIMARY KEY,
    expense_category_id BIGINT REFERENCES expense_categories(expense_category_id),
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BUDGETS
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_categories (
    budget_category_id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
    budget_id BIGSERIAL PRIMARY KEY,
    budget_category_id BIGINT REFERENCES budget_categories(budget_category_id),
    fiscal_year INT NOT NULL,
    allocated_amount NUMERIC(12, 2) NOT NULL,
    remarks TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PARISH PROJECTS & BACKUPS
-- ============================================================

CREATE TABLE IF NOT EXISTS parish_projects (
    project_id BIGSERIAL PRIMARY KEY,
    project_name VARCHAR(200),
    description TEXT,
    budget NUMERIC(12, 2),
    status VARCHAR(30),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backups (
    backup_id BIGSERIAL PRIMARY KEY,
    backup_name VARCHAR(200),
    created_by UUID REFERENCES profiles(id),
    backup_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (Phase 1)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Auto-create profile when a user registers (reads role/name from auth metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_first_name TEXT := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'User');
    v_middle_name TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'middle_name'), '');
    v_last_name TEXT := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), 'Account');
    v_suffix TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'suffix'), '');
    v_role TEXT := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'Parish Officer');
    v_full_name TEXT;
BEGIN
    IF v_role NOT IN ('Administrator', 'Treasurer', 'Parish Officer') THEN
        v_role := 'Parish Officer';
    END IF;

    v_full_name := TRIM(CONCAT_WS(' ', v_first_name, v_middle_name, v_last_name, v_suffix));

    INSERT INTO public.profiles (
        id,
        employee_no,
        first_name,
        middle_name,
        last_name,
        suffix,
        full_name,
        role,
        status
    ) VALUES (
        NEW.id,
        NULLIF(TRIM(NEW.raw_user_meta_data->>'employee_no'), ''),
        v_first_name,
        v_middle_name,
        v_last_name,
        v_suffix,
        v_full_name,
        v_role,
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

DROP POLICY IF EXISTS "Users can view own login history" ON login_history;
CREATE POLICY "Users can view own login history"
    ON login_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own login history" ON login_history;
CREATE POLICY "Users can insert own login history"
    ON login_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own login history" ON login_history;
CREATE POLICY "Users can update own login history"
    ON login_history FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
CREATE POLICY "Users can insert own audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE: profile pictures bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
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
    );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================
-- SEED: Administrator profile
-- ============================================================
-- 1) Create the login first:
--    Supabase → Authentication → Users → Add user
--    (email + password live in auth.users, NOT in profiles)
--
-- 2) Then run ONE of the inserts below.
-- ============================================================

-- Option A (recommended): match by Auth email
-- Change 'admin@sfxa.local' to the email you created in Authentication
INSERT INTO profiles (
    id,
    employee_no,
    first_name,
    middle_name,
    last_name,
    suffix,
    full_name,
    sex,
    birth_date,
    contact_number,
    address,
    profile_picture,
    role,
    status
)
SELECT
    u.id,
    'EMP-ADMIN-001',
    'Admin',
    NULL,
    'User',
    NULL,
    'Admin User',
    'Male',
    NULL,
    NULL,
    NULL,
    NULL,
    'Administrator',
    TRUE
FROM auth.users AS u
WHERE u.email = 'admin@sfxa.local'
ON CONFLICT (id) DO UPDATE SET
    role = 'Administrator',
    status = TRUE,
    updated_at = NOW();

-- Option B: paste the Auth user UUID from Authentication → Users
-- INSERT INTO profiles (
--     id,
--     employee_no,
--     first_name,
--     middle_name,
--     last_name,
--     suffix,
--     full_name,
--     sex,
--     birth_date,
--     contact_number,
--     address,
--     profile_picture,
--     role,
--     status
-- ) VALUES (
--     'PASTE-AUTH-USER-UUID-HERE',
--     'EMP-ADMIN-001',
--     'Admin',
--     NULL,
--     'User',
--     NULL,
--     'Admin User',
--     'Male',
--     NULL,
--     NULL,
--     NULL,
--     NULL,
--     'Administrator',
--     TRUE
-- )
-- ON CONFLICT (id) DO UPDATE SET
--     role = 'Administrator',
--     status = TRUE,
--     updated_at = NOW();

