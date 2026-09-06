-- ============================================================
-- PHASE 10: Electronic research informed consent (e-Consent)
-- Run in Supabase SQL editor after prior phases.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS research_consent_status VARCHAR(20)
    CHECK (
      research_consent_status IS NULL
      OR research_consent_status IN ('Agreed', 'Declined')
    );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS research_consent_version VARCHAR(20);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS research_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.research_consent_status IS
  'Electronic informed consent for research participation (Agreed / Declined).';
COMMENT ON COLUMN public.profiles.research_consent_version IS
  'Consent form version the student last responded to (e.g. v1.0).';
COMMENT ON COLUMN public.profiles.research_consent_at IS
  'Timestamp when the student last recorded a consent decision.';

CREATE TABLE IF NOT EXISTS public.research_consents (
  consent_id BIGSERIAL PRIMARY KEY,
  student_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
  student_number VARCHAR(30),
  consent_status VARCHAR(20) NOT NULL
    CHECK (consent_status IN ('Agreed', 'Declined')),
  consent_version VARCHAR(20) NOT NULL,
  read_understood BOOLEAN NOT NULL DEFAULT FALSE,
  voluntarily_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address VARCHAR(64),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_consents_student
  ON public.research_consents(student_id, consented_at DESC);

ALTER TABLE public.research_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students insert own research consent" ON public.research_consents;
CREATE POLICY "Students insert own research consent"
ON public.research_consents FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND public.current_user_role() = 'Student'
);

DROP POLICY IF EXISTS "Students view own research consent" ON public.research_consents;
CREATE POLICY "Students view own research consent"
ON public.research_consents FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
  OR public.current_user_role() = 'Guidance Counselor'
);

DROP POLICY IF EXISTS "Guidance view research consents" ON public.research_consents;
CREATE POLICY "Guidance view research consents"
ON public.research_consents FOR SELECT
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor');
