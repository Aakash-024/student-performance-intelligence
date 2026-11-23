-- ============================================================================
-- ACADNEX Migration 008: configurable academic terms
-- ============================================================================
-- The original schema capped semesters at 1 and 2. Colleges may run 6 or 8
-- semesters, so widen the range to 1-8. Staff (teachers and admins) manage
-- terms directly in the app; only authenticated staff accounts exist in ACADNEX,
-- so `TO authenticated` is the staff group.
-- ============================================================================

-- 1. Replace the hard-coded two-semester check with a 1-8 range.
ALTER TABLE public.academic_terms
    DROP CONSTRAINT IF EXISTS academic_terms_semester_check;

ALTER TABLE public.academic_terms
    ADD CONSTRAINT academic_terms_semester_check CHECK (semester BETWEEN 1 AND 8);

-- 2. Replace admin-only writes with staff writes (teachers + admins).
DROP POLICY IF EXISTS terms_insert_admin ON public.academic_terms;
DROP POLICY IF EXISTS terms_update_admin ON public.academic_terms;
DROP POLICY IF EXISTS terms_insert_staff ON public.academic_terms;
DROP POLICY IF EXISTS terms_update_staff ON public.academic_terms;
DROP POLICY IF EXISTS terms_delete_staff ON public.academic_terms;

CREATE POLICY terms_insert_staff
    ON public.academic_terms FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY terms_update_staff
    ON public.academic_terms FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY terms_delete_staff
    ON public.academic_terms FOR DELETE
    TO authenticated
    USING (true);

-- SELECT policy (`terms_select_authenticated`) and UNIQUE (year, semester)
-- are unchanged. Dependent rows use ON DELETE RESTRICT for assessments,
-- attendance, and enrollments, so a term with real data cannot be removed.
