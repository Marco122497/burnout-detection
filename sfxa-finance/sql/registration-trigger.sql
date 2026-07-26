-- Run this in Supabase SQL Editor to fix "Registration failed (HTTP 500)".
-- A failing profile trigger rolls back auth user creation and Auth returns 500.

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    v_first_name TEXT := COALESCE(NULLIF(TRIM(meta->>'first_name'), ''), 'User');
    v_middle_name TEXT := NULLIF(TRIM(meta->>'middle_name'), '');
    v_last_name TEXT := COALESCE(NULLIF(TRIM(meta->>'last_name'), ''), 'Account');
    v_suffix TEXT := NULLIF(TRIM(meta->>'suffix'), '');
    v_employee_no TEXT := NULLIF(TRIM(meta->>'employee_no'), '');
    v_role TEXT := COALESCE(NULLIF(TRIM(meta->>'role'), ''), 'Parish Officer');
    v_full_name TEXT := NULLIF(TRIM(meta->>'full_name'), '');
BEGIN
    IF v_role NOT IN ('Administrator', 'Treasurer', 'Parish Officer') THEN
        v_role := 'Parish Officer';
    END IF;

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := TRIM(CONCAT_WS(' ', v_first_name, v_middle_name, v_last_name, v_suffix));
    END IF;

    BEGIN
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
            v_employee_no,
            v_first_name,
            v_middle_name,
            v_last_name,
            v_suffix,
            v_full_name,
            v_role,
            TRUE
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN unique_violation THEN
            -- e.g. duplicate employee_no — still create the profile without it
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
                NULL,
                v_first_name,
                v_middle_name,
                v_last_name,
                v_suffix,
                v_full_name,
                v_role,
                TRUE
            )
            ON CONFLICT (id) DO NOTHING;
        WHEN OTHERS THEN
            -- Never block auth.users insert; app can create the profile as fallback.
            RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Ensure the function can write profiles under RLS
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
