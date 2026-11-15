-- ============================================================================
-- SPIP Migration 002: Row Level Security Policies
-- Student Performance Intelligence Platform
-- ============================================================================
-- Enforces access control at the database level.
-- Admins: full access to all data.
-- Teachers: read all academic data; write marks and attendance for their sections.
-- ============================================================================

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- ============================================================================
-- Enable RLS on ALL tables
-- ============================================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DEPARTMENTS — All authenticated can read; admins can write
-- ============================================================================
CREATE POLICY "departments_select_authenticated"
    ON public.departments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "departments_insert_admin"
    ON public.departments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "departments_update_admin"
    ON public.departments FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "departments_delete_admin"
    ON public.departments FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================================
-- SECTIONS — All authenticated can read; admins can write
-- ============================================================================
CREATE POLICY "sections_select_authenticated"
    ON public.sections FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "sections_insert_admin"
    ON public.sections FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "sections_update_admin"
    ON public.sections FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "sections_delete_admin"
    ON public.sections FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================================
-- PROFILES — Users can read all; update only own; admins can write all
-- ============================================================================
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_admin"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR id = auth.uid());

-- ============================================================================
-- TEACHER PROFILES — All can read; admins can write
-- ============================================================================
CREATE POLICY "teacher_profiles_select_authenticated"
    ON public.teacher_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "teacher_profiles_insert_admin"
    ON public.teacher_profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "teacher_profiles_update_admin"
    ON public.teacher_profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "teacher_profiles_delete_admin"
    ON public.teacher_profiles FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================================
-- STUDENTS — All authenticated can read; admins can write
-- ============================================================================
CREATE POLICY "students_select_authenticated"
    ON public.students FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "students_insert_admin"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "students_update_admin"
    ON public.students FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "students_delete_admin"
    ON public.students FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================================
-- SUBJECTS — All authenticated can read; admins can write
-- ============================================================================
CREATE POLICY "subjects_select_authenticated"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "subjects_insert_admin"
    ON public.subjects FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "subjects_update_admin"
    ON public.subjects FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "subjects_delete_admin"
    ON public.subjects FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================================
-- ACADEMIC TERMS — All can read; admins can write
-- ============================================================================
CREATE POLICY "terms_select_authenticated"
    ON public.academic_terms FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "terms_insert_admin"
    ON public.academic_terms FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "terms_update_admin"
    ON public.academic_terms FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- ENROLLMENTS — All can read; admins can write
-- ============================================================================
CREATE POLICY "enrollments_select_authenticated"
    ON public.enrollments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "enrollments_insert_admin"
    ON public.enrollments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "enrollments_update_admin"
    ON public.enrollments FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- ASSESSMENTS — All can read; admins can write
-- ============================================================================
CREATE POLICY "assessments_select_authenticated"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "assessments_insert_admin"
    ON public.assessments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "assessments_update_admin"
    ON public.assessments FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- MARKS — All can read; teachers and admins can write
-- ============================================================================
CREATE POLICY "marks_select_authenticated"
    ON public.marks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "marks_insert_teacher_or_admin"
    ON public.marks FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    );

CREATE POLICY "marks_update_teacher_or_admin"
    ON public.marks FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    )
    WITH CHECK (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    );

-- ============================================================================
-- ATTENDANCE SESSIONS — All can read; teachers and admins can write
-- ============================================================================
CREATE POLICY "att_sessions_select_authenticated"
    ON public.attendance_sessions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "att_sessions_insert_teacher_or_admin"
    ON public.attendance_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    );

CREATE POLICY "att_sessions_update_teacher_or_admin"
    ON public.attendance_sessions FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    )
    WITH CHECK (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    );

-- ============================================================================
-- ATTENDANCE RECORDS — All can read; teachers and admins can write
-- ============================================================================
CREATE POLICY "att_records_select_authenticated"
    ON public.attendance_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "att_records_insert_teacher_or_admin"
    ON public.attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    );

CREATE POLICY "att_records_update_teacher_or_admin"
    ON public.attendance_records FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    )
    WITH CHECK (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    );
