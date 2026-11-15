-- ============================================================================
-- SPIP Migration 001: Core Schema
-- Student Performance Intelligence Platform
-- ============================================================================
-- This migration creates all core tables, constraints, indexes, and functions.
-- RLS policies are in a separate migration (002).
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. DEPARTMENTS
-- ============================================================================
CREATE TABLE public.departments (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        text NOT NULL,
    code        text NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.departments IS 'Academic departments (e.g., Computer Science)';

-- ============================================================================
-- 2. SECTIONS
-- ============================================================================
CREATE TABLE public.sections (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id   uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name            text NOT NULL,
    year            integer NOT NULL CHECK (year BETWEEN 1 AND 6),
    created_at      timestamptz NOT NULL DEFAULT now(),

    UNIQUE (department_id, name, year)
);

CREATE INDEX idx_sections_department ON public.sections(department_id);

COMMENT ON TABLE public.sections IS 'Class sections within a department and year';

-- ============================================================================
-- 3. PROFILES (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       text NOT NULL,
    full_name   text NOT NULL,
    role        text NOT NULL CHECK (role IN ('admin', 'teacher')) DEFAULT 'teacher',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase auth. Stores role for RBAC.';

-- ============================================================================
-- 4. TEACHER PROFILES
-- ============================================================================
CREATE TABLE public.teacher_profiles (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id   uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    employee_id     text NOT NULL UNIQUE,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_profiles_department ON public.teacher_profiles(department_id);

COMMENT ON TABLE public.teacher_profiles IS 'Additional teacher info: department assignment and employee ID';

-- ============================================================================
-- 5. STUDENTS
-- ============================================================================
CREATE TABLE public.students (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    register_number text NOT NULL UNIQUE,
    name            text NOT NULL,
    email           text,
    section_id      uuid NOT NULL REFERENCES public.sections(id) ON DELETE RESTRICT,
    current_year    integer NOT NULL CHECK (current_year BETWEEN 1 AND 6),
    status          text NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_section ON public.students(section_id);
CREATE INDEX idx_students_register ON public.students(register_number);
CREATE INDEX idx_students_status ON public.students(status) WHERE status = 'active';

COMMENT ON TABLE public.students IS 'Student records with register number and section assignment';

-- ============================================================================
-- 6. SUBJECTS
-- ============================================================================
CREATE TABLE public.subjects (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            text NOT NULL UNIQUE,
    name            text NOT NULL,
    department_id   uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    credits         integer NOT NULL CHECK (credits BETWEEN 1 AND 10),
    type            text NOT NULL CHECK (type IN ('theory', 'lab', 'elective')) DEFAULT 'theory',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subjects_department ON public.subjects(department_id);

COMMENT ON TABLE public.subjects IS 'Subjects offered by a department';

-- ============================================================================
-- 7. ACADEMIC TERMS
-- ============================================================================
CREATE TABLE public.academic_terms (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        text NOT NULL,
    year        integer NOT NULL,
    semester    integer NOT NULL CHECK (semester IN (1, 2)),
    start_date  date NOT NULL,
    end_date    date NOT NULL,
    is_current  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CHECK (end_date > start_date),
    UNIQUE (year, semester)
);

COMMENT ON TABLE public.academic_terms IS 'Academic semesters/terms with date ranges';

-- ============================================================================
-- 8. ENROLLMENTS
-- ============================================================================
CREATE TABLE public.enrollments (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id          uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    academic_term_id    uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
    created_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (student_id, subject_id, academic_term_id)
);

CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_subject ON public.enrollments(subject_id);
CREATE INDEX idx_enrollments_term ON public.enrollments(academic_term_id);

COMMENT ON TABLE public.enrollments IS 'Maps students to subjects in a specific academic term';

-- ============================================================================
-- 9. ASSESSMENTS
-- ============================================================================
CREATE TABLE public.assessments (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id          uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    academic_term_id    uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
    type                text NOT NULL CHECK (type IN ('cat1', 'cat2', 'internal', 'semester')),
    max_marks           numeric(6, 2) NOT NULL CHECK (max_marks > 0),
    weightage_percent   numeric(5, 2) NOT NULL CHECK (weightage_percent BETWEEN 0 AND 100),
    date                date,
    created_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (subject_id, academic_term_id, type)
);

CREATE INDEX idx_assessments_subject ON public.assessments(subject_id);
CREATE INDEX idx_assessments_term ON public.assessments(academic_term_id);

COMMENT ON TABLE public.assessments IS 'Assessment definitions (CAT1, CAT2, internal, semester) per subject per term';

-- ============================================================================
-- 10. MARKS
-- ============================================================================
CREATE TABLE public.marks (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assessment_id   uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    marks_obtained  numeric(6, 2) NOT NULL DEFAULT 0,
    is_absent       boolean NOT NULL DEFAULT false,
    entered_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    UNIQUE (student_id, assessment_id)
);

CREATE INDEX idx_marks_student ON public.marks(student_id);
CREATE INDEX idx_marks_assessment ON public.marks(assessment_id);

COMMENT ON TABLE public.marks IS 'Individual student marks per assessment';

-- ============================================================================
-- 11. ATTENDANCE SESSIONS
-- ============================================================================
CREATE TABLE public.attendance_sessions (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id          uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    section_id          uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    academic_term_id    uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
    session_date        date NOT NULL,
    period_number       integer NOT NULL CHECK (period_number BETWEEN 1 AND 10),
    taken_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (subject_id, section_id, session_date, period_number)
);

CREATE INDEX idx_att_sessions_subject ON public.attendance_sessions(subject_id);
CREATE INDEX idx_att_sessions_section ON public.attendance_sessions(section_id);
CREATE INDEX idx_att_sessions_term ON public.attendance_sessions(academic_term_id);
CREATE INDEX idx_att_sessions_date ON public.attendance_sessions(session_date);

COMMENT ON TABLE public.attendance_sessions IS 'Individual class sessions for attendance tracking';

-- ============================================================================
-- 12. ATTENDANCE RECORDS
-- ============================================================================
CREATE TABLE public.attendance_records (
    id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_session_id   uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id              uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    is_present              boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),

    UNIQUE (attendance_session_id, student_id)
);

CREATE INDEX idx_att_records_session ON public.attendance_records(attendance_session_id);
CREATE INDEX idx_att_records_student ON public.attendance_records(student_id);

COMMENT ON TABLE public.attendance_records IS 'Per-student attendance for each session';

-- ============================================================================
-- UTILITY: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply to tables with updated_at
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_marks_updated_at
    BEFORE UPDATE ON public.marks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- UTILITY: Auto-create profile on auth.users insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'teacher')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MARKS VALIDATION: Ensure marks don't exceed max_marks
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_marks()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_max_marks numeric;
BEGIN
    IF NEW.is_absent THEN
        NEW.marks_obtained := 0;
        RETURN NEW;
    END IF;

    SELECT max_marks INTO v_max_marks
    FROM public.assessments
    WHERE id = NEW.assessment_id;

    IF NEW.marks_obtained < 0 THEN
        RAISE EXCEPTION 'Marks cannot be negative';
    END IF;

    IF NEW.marks_obtained > v_max_marks THEN
        RAISE EXCEPTION 'Marks (%) exceed maximum allowed (%)', NEW.marks_obtained, v_max_marks;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_marks_before_insert_update
    BEFORE INSERT OR UPDATE ON public.marks
    FOR EACH ROW EXECUTE FUNCTION public.validate_marks();
