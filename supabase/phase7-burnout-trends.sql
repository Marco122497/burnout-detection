-- ============================================================
-- Phase 7: Student burnout trend snapshots
-- One row per student/term/week — powers the student dashboard chart
-- ============================================================

CREATE TABLE IF NOT EXISTS burnout_trends (
    trend_id BIGSERIAL PRIMARY KEY,

    student_id UUID NOT NULL
        REFERENCES profiles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    term_id BIGINT NOT NULL
        REFERENCES academic_terms(term_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    week_number INTEGER NOT NULL
        CHECK (week_number >= 1),

    monitoring_id BIGINT NOT NULL UNIQUE
        REFERENCES weekly_monitoring(monitoring_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    mfbi_score NUMERIC(6,4) NOT NULL
        CHECK (mfbi_score BETWEEN 0 AND 1),

    risk_level VARCHAR(20) NOT NULL
        CHECK (
            risk_level IN ('Low', 'Moderate', 'High', 'Severe')
        ),

    previous_mfbi_score NUMERIC(6,4)
        CHECK (
            previous_mfbi_score IS NULL
            OR previous_mfbi_score BETWEEN 0 AND 1
        ),

    mfbi_delta NUMERIC(6,4),

    trend_direction VARCHAR(30) NOT NULL
        DEFAULT 'insufficient_history'
        CHECK (
            trend_direction IN (
                'insufficient_history',
                'increasing',
                'decreasing',
                'stable'
            )
        ),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (student_id, term_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_burnout_trends_student_term
ON burnout_trends(student_id, term_id, week_number);

ALTER TABLE burnout_trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students insert own burnout trends" ON burnout_trends;
CREATE POLICY "Students insert own burnout trends"
ON burnout_trends FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Read burnout trends by role/department" ON burnout_trends;
CREATE POLICY "Read burnout trends by role/department"
ON burnout_trends FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles me
    WHERE me.id = auth.uid()
      AND me.role = 'Guidance Counselor'
  )
  OR EXISTS (
    SELECT 1 FROM profiles me
    JOIN profiles student ON student.id = burnout_trends.student_id
    WHERE me.id = auth.uid()
      AND me.role = 'Instructor'
      AND me.department_id IS NOT NULL
      AND me.department_id = student.department_id
  )
);
