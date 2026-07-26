-- Phase 5 — Public Transparency Dashboard
-- Run in Supabase SQL Editor after phase3-treasurer.sql
-- Allows anonymous (no login) read of safe public summaries only.

ALTER TABLE parish_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read parish projects" ON parish_projects;
CREATE POLICY "Public can read parish projects"
    ON parish_projects FOR SELECT
    TO anon, authenticated
    USING (true);

-- Published announcements only for anonymous visitors
DROP POLICY IF EXISTS "Anonymous can read published announcements" ON announcements;
CREATE POLICY "Anonymous can read published announcements"
    ON announcements FOR SELECT
    TO anon
    USING (is_published = TRUE);

-- Aggregated monthly donation totals (no donor names)
CREATE OR REPLACE FUNCTION public.public_monthly_donation_totals()
RETURNS TABLE (month_key text, total numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(donation_date, 'YYYY-MM') AS month_key,
    COALESCE(SUM(amount), 0) AS total
  FROM donations
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT 12;
$$;

-- Aggregated monthly collection totals by category (no donor names)
CREATE OR REPLACE FUNCTION public.public_monthly_collection_summary()
RETURNS TABLE (month_key text, category_name text, total numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(d.donation_date, 'YYYY-MM') AS month_key,
    COALESCE(c.category_name, 'Uncategorized') AS category_name,
    COALESCE(SUM(d.amount), 0) AS total
  FROM donations d
  LEFT JOIN donation_categories c ON c.category_id = d.category_id
  WHERE c.category_name ILIKE '%Collection%'
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2 ASC
  LIMIT 48;
$$;

-- Budget utilization totals only (no expense line details)
CREATE OR REPLACE FUNCTION public.public_budget_utilization()
RETURNS TABLE (
  category_name text,
  fiscal_year int,
  allocated numeric,
  utilized numeric,
  remaining numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH spent AS (
    SELECT
      ec.category_name,
      COALESCE(SUM(e.amount), 0) AS utilized
    FROM expenses e
    LEFT JOIN expense_categories ec
      ON ec.expense_category_id = e.expense_category_id
    GROUP BY ec.category_name
  )
  SELECT
    COALESCE(bc.category_name, 'Uncategorized') AS category_name,
    b.fiscal_year,
    b.allocated_amount AS allocated,
    COALESCE(s.utilized, 0) AS utilized,
    b.allocated_amount - COALESCE(s.utilized, 0) AS remaining
  FROM budgets b
  LEFT JOIN budget_categories bc
    ON bc.budget_category_id = b.budget_category_id
  LEFT JOIN spent s
    ON s.category_name = bc.category_name
  ORDER BY b.fiscal_year DESC, category_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.public_monthly_donation_totals() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_monthly_collection_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_budget_utilization() TO anon, authenticated;
