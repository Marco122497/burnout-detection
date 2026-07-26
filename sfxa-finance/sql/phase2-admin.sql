-- Phase 2 — Administrator module schema helpers
-- Run in Supabase SQL Editor after db.sql / registration-trigger.sql

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcements_updated_at ON announcements;
CREATE TRIGGER announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION set_announcements_updated_at();

-- Avoid recursive RLS on profiles by reading role via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_administrator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'Administrator' AND status = TRUE
  );
$$;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read announcements" ON announcements;
CREATE POLICY "Authenticated can read announcements"
    ON announcements FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Administrators manage announcements" ON announcements;
CREATE POLICY "Administrators manage announcements"
    ON announcements FOR ALL
    TO authenticated
    USING (public.is_administrator())
    WITH CHECK (public.is_administrator());

DROP POLICY IF EXISTS "Administrators can view all profiles" ON profiles;
CREATE POLICY "Administrators can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_administrator());

DROP POLICY IF EXISTS "Administrators can update all profiles" ON profiles;
CREATE POLICY "Administrators can update all profiles"
    ON profiles FOR UPDATE
    TO authenticated
    USING (public.is_administrator())
    WITH CHECK (public.is_administrator());

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read donations" ON donations;
CREATE POLICY "Staff can read donations"
    ON donations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can read expenses" ON expenses;
CREATE POLICY "Staff can read expenses"
    ON expenses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can read budgets" ON budgets;
CREATE POLICY "Staff can read budgets"
    ON budgets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can read donation categories" ON donation_categories;
CREATE POLICY "Staff can read donation categories"
    ON donation_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can read expense categories" ON expense_categories;
CREATE POLICY "Staff can read expense categories"
    ON expense_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can read budget categories" ON budget_categories;
CREATE POLICY "Staff can read budget categories"
    ON budget_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Administrators can view all login history" ON login_history;
CREATE POLICY "Administrators can view all login history"
    ON login_history FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_administrator());

DROP POLICY IF EXISTS "Administrators can view all audit logs" ON audit_logs;
CREATE POLICY "Administrators can view all audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_administrator());
