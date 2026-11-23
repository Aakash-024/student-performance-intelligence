-- ============================================================================
-- ACADNEX Migration 011: staff-managed students (CSV import support)
-- ============================================================================
-- Teachers create and update student records from the Students page and from
-- the CSV Import page. DELETE stays admin-only: removing a student still has
-- cascading effects on marks, attendance and audit history.
-- ============================================================================

DROP POLICY IF EXISTS "students_insert_admin" ON public.students;
DROP POLICY IF EXISTS "students_update_admin" ON public.students;

CREATE POLICY "students_insert_staff"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role() = 'admin'
        OR public.get_user_role() = 'teacher'
    );

CREATE POLICY "students_update_staff"
    ON public.students FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role() = 'admin'
        OR public.get_user_role() = 'teacher'
    )
    WITH CHECK (
        public.get_user_role() = 'admin'
        OR public.get_user_role() = 'teacher'
    );
