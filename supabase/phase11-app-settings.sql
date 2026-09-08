-- ============================================================
-- PHASE 11: App settings (report signatories, etc.)
-- Run in Supabase SQL editor after prior phases.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.app_settings IS
  'Key/value app configuration (e.g. approving officer signatory for reports).';

CREATE OR REPLACE FUNCTION public.set_app_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_app_settings_updated_at();

INSERT INTO public.app_settings (key, value)
VALUES
  ('school_administrator_name', 'SR. LEONILA M. SAJELAN, MCM'),
  ('school_administrator_title', 'School Vice-President')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read app settings" ON public.app_settings;
CREATE POLICY "Authenticated read app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS "Guidance manage app settings" ON public.app_settings;
CREATE POLICY "Guidance manage app settings"
ON public.app_settings FOR ALL
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');
