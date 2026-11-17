-- ============================================================================
-- SPIP Migration 010: CAT 1 / CAT 2 / Semester exam only
-- ============================================================================
-- The generic "internal" assessment was a placeholder. The college runs two
-- internal exams named CAT 1 and CAT 2, so remove the placeholder entirely.
-- This is demo data only (no real college data has been loaded yet).
-- ============================================================================

-- 1. Remove placeholder assessments and everything recorded against them.
DELETE FROM public.mark_audit
WHERE assessment_id IN (SELECT id FROM public.assessments WHERE type = 'internal');

DELETE FROM public.marks
WHERE assessment_id IN (SELECT id FROM public.assessments WHERE type = 'internal');

DELETE FROM public.assessments WHERE type = 'internal';

-- 2. Redistribute the removed 20% into the two CATs so the demo's weights
--    still total 100 (CAT1 25 + CAT2 25 + Semester 50).
UPDATE public.assessments
SET weightage_percent = 25
WHERE type IN ('cat1', 'cat2') AND weightage_percent = 15;

-- 3. Narrow the database check to the three real assessment types.
ALTER TABLE public.assessments
    DROP CONSTRAINT IF EXISTS assessments_type_check;

ALTER TABLE public.assessments
    ADD CONSTRAINT assessments_type_check CHECK (type IN ('cat1', 'cat2', 'semester'));

-- 4. Staff (teachers + admins) configure assessments; previously admin-only.
--    A DELETE policy is added too — the old UI delete button silently did
--    nothing because RLS had no delete policy.
DROP POLICY IF EXISTS assessments_insert_admin ON public.assessments;
DROP POLICY IF EXISTS assessments_update_admin ON public.assessments;
DROP POLICY IF EXISTS assessments_insert_staff ON public.assessments;
DROP POLICY IF EXISTS assessments_update_staff ON public.assessments;
DROP POLICY IF EXISTS assessments_delete_staff ON public.assessments;

CREATE POLICY assessments_insert_staff
    ON public.assessments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY assessments_update_staff
    ON public.assessments FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY assessments_delete_staff
    ON public.assessments FOR DELETE
    TO authenticated
    USING (true);

COMMENT ON TABLE public.assessments IS
    'Assessment definitions (CAT 1, CAT 2, Semester exam) per subject per term';
