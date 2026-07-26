-- Phase 3 — Treasurer module
-- Run in Supabase SQL Editor after phase2-admin.sql

-- Receipt support on expenses
ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Align expense categories with the development plan
INSERT INTO expense_categories (category_name)
VALUES
    ('Utilities'),
    ('Office Supplies'),
    ('Church Maintenance'),
    ('Religious Activities'),
    ('Equipment'),
    ('Others')
ON CONFLICT (category_name) DO NOTHING;

-- Optional general donation category (collections already seeded in db.sql)
INSERT INTO donation_categories (category_name)
VALUES ('General Donation')
ON CONFLICT (category_name) DO NOTHING;

-- Seed common budget categories
INSERT INTO budget_categories (category_name)
VALUES
    ('Utilities'),
    ('Office Supplies'),
    ('Church Maintenance'),
    ('Religious Activities'),
    ('Equipment'),
    ('Operations'),
    ('Others')
ON CONFLICT (category_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_treasurer_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND status = TRUE
      AND role IN ('Treasurer', 'Administrator')
  );
$$;

-- Treasurer/Admin write access for financial tables
DROP POLICY IF EXISTS "Treasurer manage donations" ON donations;
CREATE POLICY "Treasurer manage donations"
    ON donations FOR ALL
    TO authenticated
    USING (public.is_treasurer_or_admin())
    WITH CHECK (public.is_treasurer_or_admin());

DROP POLICY IF EXISTS "Treasurer manage expenses" ON expenses;
CREATE POLICY "Treasurer manage expenses"
    ON expenses FOR ALL
    TO authenticated
    USING (public.is_treasurer_or_admin())
    WITH CHECK (public.is_treasurer_or_admin());

DROP POLICY IF EXISTS "Treasurer manage budgets" ON budgets;
CREATE POLICY "Treasurer manage budgets"
    ON budgets FOR ALL
    TO authenticated
    USING (public.is_treasurer_or_admin())
    WITH CHECK (public.is_treasurer_or_admin());

DROP POLICY IF EXISTS "Treasurer manage donation categories" ON donation_categories;
CREATE POLICY "Treasurer manage donation categories"
    ON donation_categories FOR ALL
    TO authenticated
    USING (public.is_treasurer_or_admin())
    WITH CHECK (public.is_treasurer_or_admin());

DROP POLICY IF EXISTS "Treasurer manage expense categories" ON expense_categories;
CREATE POLICY "Treasurer manage expense categories"
    ON expense_categories FOR ALL
    TO authenticated
    USING (public.is_treasurer_or_admin())
    WITH CHECK (public.is_treasurer_or_admin());

DROP POLICY IF EXISTS "Treasurer manage budget categories" ON budget_categories;
CREATE POLICY "Treasurer manage budget categories"
    ON budget_categories FOR ALL
    TO authenticated
    USING (public.is_treasurer_or_admin())
    WITH CHECK (public.is_treasurer_or_admin());

-- Receipts storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Receipts are publicly accessible" ON storage.objects;
CREATE POLICY "Receipts are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Treasurer can upload receipts" ON storage.objects;
CREATE POLICY "Treasurer can upload receipts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'receipts'
        AND public.is_treasurer_or_admin()
    );

DROP POLICY IF EXISTS "Treasurer can update receipts" ON storage.objects;
CREATE POLICY "Treasurer can update receipts"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'receipts'
        AND public.is_treasurer_or_admin()
    );

DROP POLICY IF EXISTS "Treasurer can delete receipts" ON storage.objects;
CREATE POLICY "Treasurer can delete receipts"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'receipts'
        AND public.is_treasurer_or_admin()
    );
