-- ============================================================================
-- SPIP Migration 003: Teacher assignments + access-control hardening
-- ============================================================================
-- Adds an explicit teacher -> (subject, section, term) assignment table so
-- teachers only write marks/attendance for classes they actually teach.
-- Also closes the profiles.role self-escalation hole from migration 002.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TEACHER ASSIGNMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_profile_id  uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    subject_id          uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    section_id          uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    academic_term_id    uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    created_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (teacher_profile_id, subject_id, section_id, academic_term_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher
    ON public.teacher_assignments(teacher_profile_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject_section
    ON public.teacher_assignments(subject_id, section_id);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_assignments_select_authenticated" ON public.teacher_assignments;
CREATE POLICY "teacher_assignments_select_authenticated"
    ON public.teacher_assignments FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "teacher_assignments_insert_admin" ON public.teacher_assignments;
CREATE POLICY "teacher_assignments_insert_admin"
    ON public.teacher_assignments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "teacher_assignments_delete_admin" ON public.teacher_assignments;
CREATE POLICY "teacher_assignments_delete_admin"
    ON public.teacher_assignments FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. HELPERS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.teacher_has_assignment(
    p_subject_id uuid,
    p_section_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teacher_assignments ta
        JOIN public.teacher_profiles tp ON tp.id = ta.teacher_profile_id
        WHERE tp.user_id = auth.uid()
          AND ta.subject_id = p_subject_id
          AND ta.section_id = p_section_id
    );
$$;

-- Prevent non-admins from changing their own role through profiles_update_own.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND coalesce(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- 3. TIGHTEN PROFILE INSERT (trigger runs SECURITY DEFINER, so it still works)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. SCOPE MARKS WRITES TO ASSIGNED CLASSES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "marks_insert_teacher_or_admin" ON public.marks;
CREATE POLICY "marks_insert_teacher_or_admin"
    ON public.marks FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.get_user_role() = 'teacher'
            AND EXISTS (
                SELECT 1
                FROM public.students s
                JOIN public.assessments a ON a.id = marks.assessment_id
                WHERE s.id = marks.student_id
                  AND public.teacher_has_assignment(a.subject_id, s.section_id)
            )
        )
    );

DROP POLICY IF EXISTS "marks_update_teacher_or_admin" ON public.marks;
CREATE POLICY "marks_update_teacher_or_admin"
    ON public.marks FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.get_user_role() = 'teacher'
            AND EXISTS (
                SELECT 1
                FROM public.students s
                JOIN public.assessments a ON a.id = marks.assessment_id
                WHERE s.id = marks.student_id
                  AND public.teacher_has_assignment(a.subject_id, s.section_id)
            )
        )
    );

-- ---------------------------------------------------------------------------
-- 5. SCOPE ATTENDANCE SESSION WRITES TO ASSIGNED CLASSES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "att_sessions_insert_teacher_or_admin" ON public.attendance_sessions;
CREATE POLICY "att_sessions_insert_teacher_or_admin"
    ON public.attendance_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.get_user_role() = 'teacher'
            AND public.teacher_has_assignment(subject_id, section_id)
        )
    );

DROP POLICY IF EXISTS "att_sessions_update_teacher_or_admin" ON public.attendance_sessions;
CREATE POLICY "att_sessions_update_teacher_or_admin"
    ON public.attendance_sessions FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.get_user_role() = 'teacher'
            AND public.teacher_has_assignment(subject_id, section_id)
        )
    );

-- ---------------------------------------------------------------------------
-- 6. SCOPE ATTENDANCE RECORD WRITES TO ASSIGNED CLASSES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "att_records_insert_teacher_or_admin" ON public.attendance_records;
CREATE POLICY "att_records_insert_teacher_or_admin"
    ON public.attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.get_user_role() = 'teacher'
            AND EXISTS (
                SELECT 1
                FROM public.attendance_sessions ses
                WHERE ses.id = attendance_records.attendance_session_id
                  AND public.teacher_has_assignment(ses.subject_id, ses.section_id)
            )
        )
    );

DROP POLICY IF EXISTS "att_records_update_teacher_or_admin" ON public.attendance_records;
CREATE POLICY "att_records_update_teacher_or_admin"
    ON public.attendance_records FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR public.get_user_role() = 'teacher'
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.get_user_role() = 'teacher'
            AND EXISTS (
                SELECT 1
                FROM public.attendance_sessions ses
                WHERE ses.id = attendance_records.attendance_session_id
                  AND public.teacher_has_assignment(ses.subject_id, ses.section_id)
            )
        )
    );
