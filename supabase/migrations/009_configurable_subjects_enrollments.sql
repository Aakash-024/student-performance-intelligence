-- ============================================================================
-- ACADNEX Migration 009: editable subjects and enrolments for staff
-- ============================================================================
-- College regulations change year to year, so the teachers who run the
-- platform must be able to rename subjects, change codes, and decide which
-- subjects each section takes in each term. Only staff have auth accounts,
-- so `TO authenticated` is the staff group (teachers + administrators).
-- ============================================================================

-- SUBJECTS: staff write (was admin-only).
DROP POLICY IF EXISTS subjects_insert_admin ON public.subjects;
DROP POLICY IF EXISTS subjects_update_admin ON public.subjects;
DROP POLICY IF EXISTS subjects_delete_admin ON public.subjects;
DROP POLICY IF EXISTS subjects_insert_staff ON public.subjects;
DROP POLICY IF EXISTS subjects_update_staff ON public.subjects;
DROP POLICY IF EXISTS subjects_delete_staff ON public.subjects;

CREATE POLICY subjects_insert_staff
    ON public.subjects FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY subjects_update_staff
    ON public.subjects FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY subjects_delete_staff
    ON public.subjects FOR DELETE
    TO authenticated
    USING (true);

-- ENROLLMENTS: staff write, including DELETE (there was no delete policy).
DROP POLICY IF EXISTS enrollments_insert_admin ON public.enrollments;
DROP POLICY IF EXISTS enrollments_update_admin ON public.enrollments;
DROP POLICY IF EXISTS enrollments_insert_staff ON public.enrollments;
DROP POLICY IF EXISTS enrollments_update_staff ON public.enrollments;
DROP POLICY IF EXISTS enrollments_delete_staff ON public.enrollments;

CREATE POLICY enrollments_insert_staff
    ON public.enrollments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY enrollments_update_staff
    ON public.enrollments FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY enrollments_delete_staff
    ON public.enrollments FOR DELETE
    TO authenticated
    USING (true);

-- `subjects_select_authenticated` and `enrollments_select_authenticated`
-- are unchanged. Enrollments reference subjects with ON DELETE RESTRICT, so
-- a subject that is still enrolled anywhere cannot be deleted (the app shows
-- a friendly message instead of a database error).
