-- Phase 6 — Budget Management Module
-- Run in Supabase SQL Editor after phase5-public.sql

CREATE TABLE IF NOT EXISTS budget_history (
    history_id BIGSERIAL PRIMARY KEY,
    budget_id BIGINT REFERENCES budgets(budget_id) ON DELETE SET NULL,
    budget_category_id BIGINT,
    category_name VARCHAR(100),
    fiscal_year INT,
    previous_amount NUMERIC(12, 2),
    new_amount NUMERIC(12, 2),
    action VARCHAR(30) NOT NULL,
    remarks TEXT,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS budget_history_changed_at_idx
    ON budget_history (changed_at DESC);

ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read budget history" ON budget_history;
CREATE POLICY "Staff can read budget history"
    ON budget_history FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Treasurer manage budget history" ON budget_history;
CREATE POLICY "Treasurer manage budget history"
    ON budget_history FOR INSERT
    TO authenticated
    WITH CHECK (public.is_treasurer_or_admin());
