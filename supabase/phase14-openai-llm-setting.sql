-- ============================================================
-- PHASE 14: Guidance toggle for OpenAI LLM wording
-- Run in Supabase SQL editor after phase11-app-settings.sql
-- RAG retrieval still runs when this is false; only LLM wording is skipped.
-- ============================================================

INSERT INTO public.app_settings (key, value)
VALUES ('openai_llm_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
