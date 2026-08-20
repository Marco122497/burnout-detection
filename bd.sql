-- ============================================================
-- TABLE: PROFILES
-- Extends Supabase Authentication (auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (

    -- Primary Key (Supabase Auth)
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    -- User Role
    role VARCHAR(30) NOT NULL
        CHECK (
            role IN (
                'Student',
                'Instructor',
                'Guidance Counselor'
            )
        ),

    -- Identification
    employee_no VARCHAR(30) UNIQUE,
    student_number VARCHAR(30) UNIQUE,

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(20),

    sex VARCHAR(10)
        CHECK (sex IN ('Male', 'Female')),

    birth_date DATE,

    age INTEGER
        CHECK (age >= 15),

    civil_status VARCHAR(20)
        CHECK (
            civil_status IN (
                'Single',
                'Married',
                'Widowed',
                'Separated'
            )
        ),

    contact_number VARCHAR(20),

    address TEXT,

    profile_picture TEXT,

    -- ========================================================
    -- STUDENT INFORMATION
    -- ========================================================

    course VARCHAR(150),

    year_level INTEGER
        CHECK (year_level BETWEEN 1 AND 6),

    section VARCHAR(50),

    enrollment_status VARCHAR(20)
        DEFAULT 'Regular'
        CHECK (
            enrollment_status IN (
                'Regular',
                'Irregular',
                'Leave of Absence',
                'Graduated',
                'Dropped'
            )
        ),

    -- ========================================================
    -- EMPLOYEE INFORMATION
    -- ========================================================

    designation VARCHAR(100),

    employment_status VARCHAR(30)
        CHECK (
            employment_status IN (
                'Permanent',
                'Temporary',
                'Contractual',
                'Part-Time',
                'Full-Time'
            )
        ),

    -- ========================================================
    -- DEPARTMENT
    -- FK will be added after departments table is created
    -- ========================================================

    department_id BIGINT,

    -- ========================================================
    -- ACCOUNT STATUS
    -- ========================================================

    is_active BOOLEAN DEFAULT TRUE,

    is_verified BOOLEAN DEFAULT FALSE,

    last_login TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at
ON profiles;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE
ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_profiles_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role
ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_student_number
ON profiles(student_number);

CREATE INDEX IF NOT EXISTS idx_profiles_employee_no
ON profiles(employee_no);

CREATE INDEX IF NOT EXISTS idx_profiles_department
ON profiles(department_id);

CREATE INDEX IF NOT EXISTS idx_profiles_course
ON profiles(course);

CREATE INDEX IF NOT EXISTS idx_profiles_year_level
ON profiles(year_level);

CREATE INDEX IF NOT EXISTS idx_profiles_section
ON profiles(section);

CREATE INDEX IF NOT EXISTS idx_profiles_active
ON profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON profiles(created_at);





-- ============================================================
-- TABLE: DEPARTMENTS
-- Master list of academic departments
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (

    -- Primary Key
    department_id BIGSERIAL PRIMARY KEY,

    -- Department Information
    department_code VARCHAR(20) NOT NULL UNIQUE,

    department_name VARCHAR(150) NOT NULL UNIQUE,

    college VARCHAR(150),

    description TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_departments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_departments_updated_at
ON departments;

CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE
ON departments
FOR EACH ROW
EXECUTE FUNCTION set_departments_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_departments_code
ON departments(department_code);

CREATE INDEX IF NOT EXISTS idx_departments_name
ON departments(department_name);

CREATE INDEX IF NOT EXISTS idx_departments_active
ON departments(is_active);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO departments (
    department_code,
    department_name,
    college,
    description
)
VALUES
('CS', 'Computer Science', 'College of Computing Studies', 'Bachelor of Science in Computer Science'),
('IT', 'Information Technology', 'College of Computing Studies', 'Bachelor of Science in Information Technology'),
('IS', 'Information Systems', 'College of Computing Studies', 'Bachelor of Science in Information Systems')
ON CONFLICT (department_code) DO NOTHING;

-- ============================================================
-- ADD FOREIGN KEY TO PROFILES
-- Execute this after both tables are created
-- ============================================================

ALTER TABLE profiles
ADD CONSTRAINT fk_profiles_department
FOREIGN KEY (department_id)
REFERENCES departments(department_id)
ON DELETE SET NULL
ON UPDATE CASCADE;




-- ============================================================
-- TABLE: ACADEMIC TERMS
-- Stores Academic Year and Semester Information
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_terms (

    -- Primary Key
    term_id BIGSERIAL PRIMARY KEY,

    -- Academic Year
    academic_year VARCHAR(20) NOT NULL,

    -- Semester
    semester VARCHAR(20) NOT NULL
        CHECK (
            semester IN (
                '1st Semester',
                '2nd Semester',
                'Summer'
            )
        ),

    -- Term Duration
    start_date DATE NOT NULL,

    end_date DATE NOT NULL,

    -- Active Academic Term
    is_active BOOLEAN DEFAULT FALSE,

    -- Guidance-controlled weekly monitoring window
    monitoring_week INTEGER NOT NULL DEFAULT 1
        CHECK (monitoring_week >= 1),
    monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Validation
    CONSTRAINT chk_term_dates
        CHECK (end_date > start_date),

    -- Prevent duplicate academic terms
    CONSTRAINT uq_academic_term
        UNIQUE (academic_year, semester)

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_academic_terms_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academic_terms_updated_at
ON academic_terms;

CREATE TRIGGER trg_academic_terms_updated_at
BEFORE UPDATE
ON academic_terms
FOR EACH ROW
EXECUTE FUNCTION set_academic_terms_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_academic_terms_year
ON academic_terms(academic_year);

CREATE INDEX IF NOT EXISTS idx_academic_terms_semester
ON academic_terms(semester);

CREATE INDEX IF NOT EXISTS idx_academic_terms_active
ON academic_terms(is_active);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO academic_terms (
    academic_year,
    semester,
    start_date,
    end_date,
    is_active
)
VALUES
(
    '2026-2027',
    '1st Semester',
    '2026-08-03',
    '2026-12-18',
    TRUE
),
(
    '2026-2027',
    '2nd Semester',
    '2027-01-11',
    '2027-05-28',
    FALSE
)
ON CONFLICT (academic_year, semester) DO NOTHING;






-- ============================================================
-- TABLE: QUESTIONNAIRES
-- Master table for all assessment instruments
-- Managed by the Guidance Counselor
-- ============================================================

CREATE TABLE IF NOT EXISTS questionnaires (

    -- Primary Key
    questionnaire_id BIGSERIAL PRIMARY KEY,

    -- Questionnaire Information
    questionnaire_name VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    -- Number of Questions (optional, for display/reporting)
    total_questions INTEGER DEFAULT 0
        CHECK (total_questions >= 0),

    -- Questionnaire Settings
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Information
    created_by UUID
        REFERENCES profiles(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_questionnaires_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_questionnaires_updated_at
ON questionnaires;

CREATE TRIGGER trg_questionnaires_updated_at
BEFORE UPDATE
ON questionnaires
FOR EACH ROW
EXECUTE FUNCTION set_questionnaires_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_questionnaires_name
ON questionnaires(questionnaire_name);

CREATE INDEX IF NOT EXISTS idx_questionnaires_active
ON questionnaires(is_active);

CREATE INDEX IF NOT EXISTS idx_questionnaires_created_by
ON questionnaires(created_by);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO questionnaires (
    questionnaire_name,
    description,
    total_questions
)
VALUES
(
    'Perceived Stress Scale (PSS-10)',
    'PSS-10 stress assessment for the last month. Response scale: 0 Never, 1 Almost Never, 2 Sometimes, 3 Fairly Often, 4 Very Often. Reverse-scored items: 4, 5, 7, and 8. Total score 0–40 (0–13 Low, 14–26 Moderate, 27–40 High).',
    10
),
(
    'Academic Workload',
    'Measures students'' academic workload.',
    0
),
(
    'Study Time',
    'Response scale: 1 = Less than 1 hour/day, 2 = 1–2 hours/day, 3 = 3–4 hours/day, 4 = 5–6 hours/day, 5 = More than 6 hours/day.',
    0
),
(
    'Sleep Hours',
    'Measures students'' sleeping patterns and duration.',
    0
)
ON CONFLICT (questionnaire_name) DO NOTHING;




-- ============================================================
-- TABLE: QUESTIONS
-- Stores all questions for every questionnaire
-- ============================================================

CREATE TABLE IF NOT EXISTS questions (

    -- Primary Key
    question_id BIGSERIAL PRIMARY KEY,

    -- Questionnaire Reference
    questionnaire_id BIGINT NOT NULL
        REFERENCES questionnaires(questionnaire_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Question
    question_text TEXT NOT NULL,

    -- Display Order
    question_order INTEGER NOT NULL
        CHECK (question_order > 0),

    -- Response Settings
    response_type VARCHAR(30) NOT NULL
        DEFAULT 'Likert Scale'
        CHECK (
            response_type IN (
                'Likert Scale',
                'Number',
                'Hours',
                'Yes/No'
            )
        ),

    -- PSS Reverse Scoring
    reverse_scored BOOLEAN DEFAULT FALSE,

    -- Required Question
    is_required BOOLEAN DEFAULT TRUE,

    -- Active Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Information
    created_by UUID
        REFERENCES profiles(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate question order within the same questionnaire
    CONSTRAINT uq_questionnaire_order
        UNIQUE (questionnaire_id, question_order)

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_questions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_questions_updated_at
ON questions;

CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE
ON questions
FOR EACH ROW
EXECUTE FUNCTION set_questions_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_questions_questionnaire
ON questions(questionnaire_id);

CREATE INDEX IF NOT EXISTS idx_questions_order
ON questions(question_order);

CREATE INDEX IF NOT EXISTS idx_questions_active
ON questions(is_active);

CREATE INDEX IF NOT EXISTS idx_questions_created_by
ON questions(created_by);




-- ============================================================
-- TABLE: WEEKLY MONITORING
-- Stores one consolidated weekly monitoring submission
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_monitoring (

    -- Primary Key
    monitoring_id BIGSERIAL PRIMARY KEY,

    -- Student
    student_id UUID NOT NULL
        REFERENCES profiles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Academic Term
    term_id BIGINT NOT NULL
        REFERENCES academic_terms(term_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Monitoring Week
    week_number INTEGER NOT NULL
        CHECK (week_number >= 1),

    -- Questionnaire Scores
    stress_score NUMERIC(6,2) NOT NULL
        CHECK (stress_score >= 0),

    academic_workload_score NUMERIC(6,2) NOT NULL
        CHECK (academic_workload_score >= 0),

    study_time_score NUMERIC(6,2) NOT NULL
        CHECK (study_time_score >= 0),

    sleep_hours_score NUMERIC(6,2) NOT NULL
        CHECK (sleep_hours_score >= 0),

    -- Submission Status
    status VARCHAR(20)
        DEFAULT 'Submitted'
        CHECK (
            status IN (
                'Draft',
                'Submitted',
                'Reviewed'
            )
        ),

    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    remarks TEXT,

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One submission per student per week per academic term
    CONSTRAINT uq_weekly_monitoring
        UNIQUE (
            student_id,
            term_id,
            week_number
        )

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_weekly_monitoring_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weekly_monitoring_updated_at
ON weekly_monitoring;

CREATE TRIGGER trg_weekly_monitoring_updated_at
BEFORE UPDATE
ON weekly_monitoring
FOR EACH ROW
EXECUTE FUNCTION set_weekly_monitoring_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_student
ON weekly_monitoring(student_id);

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_term
ON weekly_monitoring(term_id);

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_week
ON weekly_monitoring(week_number);

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_status
ON weekly_monitoring(status);

CREATE INDEX IF NOT EXISTS idx_weekly_monitoring_submitted
ON weekly_monitoring(submitted_at);




-- ============================================================
-- TABLE: WEEKLY MONITORING ANSWERS
-- Stores individual student responses for each question
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_monitoring_answers (

    -- Primary Key
    answer_id BIGSERIAL PRIMARY KEY,

    -- Weekly Monitoring Session
    monitoring_id BIGINT NOT NULL
        REFERENCES weekly_monitoring(monitoring_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Question Answered
    question_id BIGINT NOT NULL
        REFERENCES questions(question_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Student Response
    answer_value SMALLINT NOT NULL
        CHECK (answer_value BETWEEN 1 AND 5),

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate answers
    CONSTRAINT uq_monitoring_question
        UNIQUE (
            monitoring_id,
            question_id
        )

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_weekly_monitoring_answers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weekly_monitoring_answers_updated_at
ON weekly_monitoring_answers;

CREATE TRIGGER trg_weekly_monitoring_answers_updated_at
BEFORE UPDATE
ON weekly_monitoring_answers
FOR EACH ROW
EXECUTE FUNCTION set_weekly_monitoring_answers_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_wma_monitoring
ON weekly_monitoring_answers(monitoring_id);

CREATE INDEX IF NOT EXISTS idx_wma_question
ON weekly_monitoring_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_wma_answer
ON weekly_monitoring_answers(answer_value);

CREATE INDEX IF NOT EXISTS idx_wma_created
ON weekly_monitoring_answers(created_at);





-- ============================================================
-- TABLE: MFBI RESULTS
-- Stores the computed Multi-Factor Burnout Index (MFBI)
-- ============================================================

CREATE TABLE IF NOT EXISTS mfbi_results (

    -- Primary Key
    mfbi_id BIGSERIAL PRIMARY KEY,

    -- Weekly Monitoring Reference
    monitoring_id BIGINT NOT NULL UNIQUE
        REFERENCES weekly_monitoring(monitoring_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Normalized Variables (0 - 1)
    normalized_stress NUMERIC(6,4) NOT NULL
        CHECK (normalized_stress BETWEEN 0 AND 1),

    normalized_academic_workload NUMERIC(6,4) NOT NULL
        CHECK (normalized_academic_workload BETWEEN 0 AND 1),

    normalized_study_time NUMERIC(6,4) NOT NULL
        CHECK (normalized_study_time BETWEEN 0 AND 1),

    normalized_sleep_hours NUMERIC(6,4) NOT NULL
        CHECK (normalized_sleep_hours BETWEEN 0 AND 1),

    -- Multi-Factor Burnout Index
    mfbi_score NUMERIC(6,4) NOT NULL
        CHECK (mfbi_score BETWEEN 0 AND 1),

    -- Burnout Risk Classification
    burnout_risk_level VARCHAR(20) NOT NULL
        CHECK (
            burnout_risk_level IN (
                'Low',
                'Moderate',
                'High',
                'Severe'
            )
        ),

    -- Optional Remarks
    remarks TEXT,

    -- Date Computed
    computed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_mfbi_results_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mfbi_results_updated_at
ON mfbi_results;

CREATE TRIGGER trg_mfbi_results_updated_at
BEFORE UPDATE
ON mfbi_results
FOR EACH ROW
EXECUTE FUNCTION set_mfbi_results_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_mfbi_monitoring
ON mfbi_results(monitoring_id);

CREATE INDEX IF NOT EXISTS idx_mfbi_score
ON mfbi_results(mfbi_score);

CREATE INDEX IF NOT EXISTS idx_mfbi_risk
ON mfbi_results(burnout_risk_level);

CREATE INDEX IF NOT EXISTS idx_mfbi_computed
ON mfbi_results(computed_at);




-- ============================================================
-- TABLE: ML PREDICTIONS
-- Stores Machine Learning prediction results
-- ============================================================

CREATE TABLE IF NOT EXISTS ml_predictions (

    -- Primary Key
    prediction_id BIGSERIAL PRIMARY KEY,

    -- MFBI Result Reference
    mfbi_id BIGINT NOT NULL UNIQUE
        REFERENCES mfbi_results(mfbi_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- ========================================================
    -- DECISION TREE RESULTS
    -- ========================================================

    decision_tree_prediction VARCHAR(20) NOT NULL
        CHECK (
            decision_tree_prediction IN (
                'Low',
                'Moderate',
                'High',
                'Severe'
            )
        ),

    decision_tree_confidence NUMERIC(5,2)
        CHECK (
            decision_tree_confidence BETWEEN 0 AND 100
        ),

    -- ========================================================
    -- RANDOM FOREST RESULTS
    -- ========================================================

    random_forest_prediction VARCHAR(20) NOT NULL
        CHECK (
            random_forest_prediction IN (
                'Low',
                'Moderate',
                'High',
                'Severe'
            )
        ),

    random_forest_confidence NUMERIC(5,2)
        CHECK (
            random_forest_confidence BETWEEN 0 AND 100
        ),

    -- ========================================================
    -- FINAL PREDICTION
    -- ========================================================

    final_prediction VARCHAR(20) NOT NULL
        CHECK (
            final_prediction IN (
                'Low',
                'Moderate',
                'High',
                'Severe'
            )
        ),

    selected_model VARCHAR(30) NOT NULL
        CHECK (
            selected_model IN (
                'Decision Tree',
                'Random Forest'
            )
        ),

    -- ========================================================
    -- MODEL INFORMATION
    -- ========================================================

    model_version VARCHAR(50),

    prediction_date TIMESTAMPTZ DEFAULT NOW(),

    remarks TEXT,

    -- ========================================================
    -- AUDIT INFORMATION
    -- ========================================================

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_ml_predictions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ml_predictions_updated_at
ON ml_predictions;

CREATE TRIGGER trg_ml_predictions_updated_at
BEFORE UPDATE
ON ml_predictions
FOR EACH ROW
EXECUTE FUNCTION set_ml_predictions_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ml_predictions_mfbi
ON ml_predictions(mfbi_id);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_final
ON ml_predictions(final_prediction);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_model
ON ml_predictions(selected_model);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_date
ON ml_predictions(prediction_date);




-- ============================================================
-- TABLE: RECOMMENDATIONS
-- Master table for burnout intervention recommendations
-- Managed by the Guidance Counselor
-- ============================================================

CREATE TABLE IF NOT EXISTS recommendations (

    -- Primary Key
    recommendation_id BIGSERIAL PRIMARY KEY,

    -- Burnout Risk Level
    burnout_risk_level VARCHAR(20) NOT NULL
        CHECK (
            burnout_risk_level IN (
                'Low',
                'Moderate',
                'High',
                'Severe'
            )
        ),

    -- Recommendation Information
    title VARCHAR(200) NOT NULL,

    description TEXT NOT NULL,

    recommended_action TEXT,

    follow_up_days INTEGER
        CHECK (follow_up_days >= 0),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Information
    created_by UUID
        REFERENCES profiles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate recommendation titles
    CONSTRAINT uq_recommendation_title UNIQUE(title)

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_recommendations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recommendations_updated_at
ON recommendations;

CREATE TRIGGER trg_recommendations_updated_at
BEFORE UPDATE
ON recommendations
FOR EACH ROW
EXECUTE FUNCTION set_recommendations_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_recommendations_level
ON recommendations(burnout_risk_level);

CREATE INDEX IF NOT EXISTS idx_recommendations_active
ON recommendations(is_active);

CREATE INDEX IF NOT EXISTS idx_recommendations_created_by
ON recommendations(created_by);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO recommendations (
    burnout_risk_level,
    title,
    description,
    recommended_action,
    follow_up_days
)
VALUES

(
    'Low',
    'Maintain Healthy Habits',
    'Student shows a low risk of academic burnout.',
    'Continue practicing healthy study habits, maintain adequate sleep, and participate in regular academic activities.',
    30
),

(
    'Moderate',
    'Self-Management Intervention',
    'Student shows moderate signs of academic burnout.',
    'Encourage effective time management, stress reduction activities, and monitor progress through weekly assessments.',
    14
),

(
    'High',
    'Guidance Counseling Referral',
    'Student is at high risk of academic burnout.',
    'Recommend immediate consultation with the Guidance Counselor and continuous weekly monitoring.',
    7
),

(
    'Severe',
    'Immediate Psychological Intervention',
    'Student is at severe risk of academic burnout.',
    'Immediately notify the Guidance Counselor for intervention, counseling, and possible referral to mental health professionals.',
    3
)

ON CONFLICT (title) DO NOTHING;


-- ============================================================
-- TABLE: COUNSELING RECORDS
-- Stores counseling interventions for students
-- ============================================================

CREATE TABLE IF NOT EXISTS counseling_records (

    -- Primary Key
    counseling_id BIGSERIAL PRIMARY KEY,

    -- Student
    student_id UUID NOT NULL
        REFERENCES profiles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Guidance Counselor
    guidance_counselor_id UUID NOT NULL
        REFERENCES profiles(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Machine Learning Prediction
    prediction_id BIGINT NOT NULL
        REFERENCES ml_predictions(prediction_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Recommended Intervention
    recommendation_id BIGINT
        REFERENCES recommendations(recommendation_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- Counseling Details
    counseling_date DATE NOT NULL
        DEFAULT CURRENT_DATE,

    intervention_type VARCHAR(50)
        CHECK (
            intervention_type IN (
                'Consultation',
                'Individual Counseling',
                'Group Counseling',
                'Follow-up',
                'Referral',
                'Other'
            )
        ),

    summary TEXT NOT NULL,

    counselor_notes TEXT,

    action_taken TEXT,

    follow_up_date DATE,

    -- Status
    status VARCHAR(20)
        DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'On-going',
                'Completed',
                'Cancelled'
            )
        ),

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_counseling_records_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_counseling_records_updated_at
ON counseling_records;

CREATE TRIGGER trg_counseling_records_updated_at
BEFORE UPDATE
ON counseling_records
FOR EACH ROW
EXECUTE FUNCTION set_counseling_records_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_counseling_student
ON counseling_records(student_id);

CREATE INDEX IF NOT EXISTS idx_counseling_guidance
ON counseling_records(guidance_counselor_id);

CREATE INDEX IF NOT EXISTS idx_counseling_prediction
ON counseling_records(prediction_id);

CREATE INDEX IF NOT EXISTS idx_counseling_recommendation
ON counseling_records(recommendation_id);

CREATE INDEX IF NOT EXISTS idx_counseling_status
ON counseling_records(status);

CREATE INDEX IF NOT EXISTS idx_counseling_date
ON counseling_records(counseling_date);



-- ============================================================
-- TABLE: ANNOUNCEMENTS
-- Stores announcements for students
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (

    -- Primary Key
    announcement_id BIGSERIAL PRIMARY KEY,

    -- Announcement Information
    title VARCHAR(200) NOT NULL,

    content TEXT NOT NULL,

    -- Created By (Instructor or Guidance Counselor)
    created_by UUID NOT NULL
        REFERENCES profiles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- ========================================================
    -- TARGET AUDIENCE
    -- NULL = Everyone
    -- ========================================================

    department_id BIGINT
        REFERENCES departments(department_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    course VARCHAR(150),

    year_level INTEGER
        CHECK (year_level BETWEEN 1 AND 6),

    section VARCHAR(50),

    -- ========================================================
    -- PUBLICATION
    -- ========================================================

    publish_date TIMESTAMPTZ DEFAULT NOW(),

    expiration_date TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,

    -- ========================================================
    -- AUDIT INFORMATION
    -- ========================================================

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Validation
    CONSTRAINT chk_expiration_date
        CHECK (
            expiration_date IS NULL
            OR expiration_date > publish_date
        )

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_announcements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announcements_updated_at
ON announcements;

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE
ON announcements
FOR EACH ROW
EXECUTE FUNCTION set_announcements_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_announcements_created_by
ON announcements(created_by);

CREATE INDEX IF NOT EXISTS idx_announcements_department
ON announcements(department_id);

CREATE INDEX IF NOT EXISTS idx_announcements_course
ON announcements(course);

CREATE INDEX IF NOT EXISTS idx_announcements_year_level
ON announcements(year_level);

CREATE INDEX IF NOT EXISTS idx_announcements_section
ON announcements(section);

CREATE INDEX IF NOT EXISTS idx_announcements_active
ON announcements(is_active);

CREATE INDEX IF NOT EXISTS idx_announcements_publish_date
ON announcements(publish_date);



-- ============================================================
-- TABLE: NOTIFICATIONS
-- Stores system notifications for all users
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (

    -- Primary Key
    notification_id BIGSERIAL PRIMARY KEY,

    -- Recipient
    user_id UUID NOT NULL
        REFERENCES profiles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Notification Information
    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    -- Notification Category
    notification_type VARCHAR(50) NOT NULL
        CHECK (
            notification_type IN (
                'Weekly Monitoring',
                'Assessment',
                'Burnout Alert',
                'Counseling',
                'Announcement',
                'Reminder',
                'System'
            )
        ),

    -- Priority
    priority VARCHAR(20)
        DEFAULT 'Normal'
        CHECK (
            priority IN (
                'Low',
                'Normal',
                'High',
                'Critical'
            )
        ),

    -- Read Status
    is_read BOOLEAN DEFAULT FALSE,

    read_at TIMESTAMPTZ,

    -- Optional Related Records

    announcement_id BIGINT
        REFERENCES announcements(announcement_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    monitoring_id BIGINT
        REFERENCES weekly_monitoring(monitoring_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    prediction_id BIGINT
        REFERENCES ml_predictions(prediction_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    counseling_id BIGINT
        REFERENCES counseling_records(counseling_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- Expiration
    expires_at TIMESTAMPTZ,

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_updated_at
ON notifications;

CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE
ON notifications
FOR EACH ROW
EXECUTE FUNCTION set_notifications_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_notifications_priority
ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notifications_read
ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created
ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_announcement
ON notifications(announcement_id);

CREATE INDEX IF NOT EXISTS idx_notifications_monitoring
ON notifications(monitoring_id);

CREATE INDEX IF NOT EXISTS idx_notifications_prediction
ON notifications(prediction_id);

CREATE INDEX IF NOT EXISTS idx_notifications_counseling
ON notifications(counseling_id);




-- ============================================================
-- TABLE: LOGIN HISTORY
-- Stores user login activity and login attempts
-- ============================================================

CREATE TABLE IF NOT EXISTS login_history (

    -- Primary Key
    login_history_id BIGSERIAL PRIMARY KEY,

    -- User
    user_id UUID
        REFERENCES profiles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- Authentication Information
    email VARCHAR(255),

    login_status VARCHAR(20) NOT NULL
        CHECK (
            login_status IN (
                'Success',
                'Failed'
            )
        ),

    -- Login Details
    login_time TIMESTAMPTZ DEFAULT NOW(),

    logout_time TIMESTAMPTZ,

    ip_address INET,

    user_agent TEXT,

    device_type VARCHAR(50),

    browser VARCHAR(100),

    operating_system VARCHAR(100),

    -- Optional Location Information
    location VARCHAR(255),

    -- Failure Information
    failure_reason TEXT,

    -- Session Information
    session_id UUID,

    -- Audit Information
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Validation
    CONSTRAINT chk_logout_time
        CHECK (
            logout_time IS NULL
            OR logout_time >= login_time
        )

);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_login_history_user
ON login_history(user_id);

CREATE INDEX IF NOT EXISTS idx_login_history_email
ON login_history(email);

CREATE INDEX IF NOT EXISTS idx_login_history_status
ON login_history(login_status);

CREATE INDEX IF NOT EXISTS idx_login_history_login_time
ON login_history(login_time);

CREATE INDEX IF NOT EXISTS idx_login_history_session
ON login_history(session_id);

CREATE INDEX IF NOT EXISTS idx_login_history_ip
ON login_history(ip_address);




-- ============================================================
-- TABLE: AUDIT LOGS
-- Stores user activities for system auditing
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (

    -- Primary Key
    audit_log_id BIGSERIAL PRIMARY KEY,

    -- User who performed the action
    user_id UUID
        REFERENCES profiles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- User Role at the time of action
    user_role VARCHAR(50)
        CHECK (
            user_role IN (
                'Student',
                'Instructor',
                'Guidance Counselor'
            )
        ),

    -- Action Information
    action VARCHAR(100) NOT NULL,

    action_type VARCHAR(20) NOT NULL
        CHECK (
            action_type IN (
                'CREATE',
                'READ',
                'UPDATE',
                'DELETE',
                'LOGIN',
                'LOGOUT',
                'EXPORT',
                'PREDICT'
            )
        ),

    -- Affected Table
    table_name VARCHAR(100) NOT NULL,

    -- Primary Key of the affected record
    record_id VARCHAR(100),

    -- Optional description
    description TEXT,

    -- Optional JSON snapshot
    old_values JSONB,

    new_values JSONB,

    -- Request Information
    ip_address INET,

    user_agent TEXT,

    -- Timestamp
    action_timestamp TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()

);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_role
ON audit_logs(user_role);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type
ON audit_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table
ON audit_logs(table_name);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record
ON audit_logs(record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs(action_timestamp);