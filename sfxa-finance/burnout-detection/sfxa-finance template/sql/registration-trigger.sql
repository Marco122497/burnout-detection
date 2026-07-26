-- Run this in Supabase SQL Editor if registration profiles are not auto-created.

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
