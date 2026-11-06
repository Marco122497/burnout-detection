-- ============================================================
-- PHASE 19: Research evaluation records for Chapter 4 exports
-- Run in the Supabase SQL editor after prior phases.
-- Do not insert sample rows. Functional and usability exports
-- must contain only records entered from real tests and evaluators.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.functional_test_results (
  test_id BIGSERIAL PRIMARY KEY,
  feature VARCHAR(120) NOT NULL,
  test_procedure TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  actual_result TEXT NOT NULL,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('Passed', 'Failed')),
  remarks TEXT,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_functional_tests_tested
  ON public.functional_test_results(tested_at DESC);

CREATE INDEX IF NOT EXISTS idx_functional_tests_feature
  ON public.functional_test_results(feature);

CREATE TABLE IF NOT EXISTS public.usability_evaluation_results (
  evaluation_id BIGSERIAL PRIMARY KEY,
  evaluator_id VARCHAR(40) NOT NULL,
  evaluator_type VARCHAR(40) NOT NULL
    CHECK (
      evaluator_type IN (
        'Student',
        'Instructor',
        'Guidance personnel',
        'IT expert'
      )
    ),
  questionnaire_item TEXT NOT NULL,
  response_value NUMERIC(8,2),
  total_score NUMERIC(8,2),
  evaluation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usability_eval_date
  ON public.usability_evaluation_results(evaluation_date DESC);

CREATE INDEX IF NOT EXISTS idx_usability_eval_evaluator
  ON public.usability_evaluation_results(evaluator_id);

ALTER TABLE public.functional_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usability_evaluation_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guidance manage functional tests"
  ON public.functional_test_results;
CREATE POLICY "Guidance manage functional tests"
ON public.functional_test_results
FOR ALL
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

DROP POLICY IF EXISTS "Guidance manage usability evaluations"
  ON public.usability_evaluation_results;
CREATE POLICY "Guidance manage usability evaluations"
ON public.usability_evaluation_results
FOR ALL
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor')
WITH CHECK (public.current_user_role() = 'Guidance Counselor');

COMMENT ON TABLE public.functional_test_results IS
  'Actual system test cases for Chapter 4. Do not store invented results.';
COMMENT ON TABLE public.usability_evaluation_results IS
  'Anonymized usability responses from real evaluators. evaluator_id is not a student account id.';
