-- ============================================================================
-- ACADNEX Migration 007: mark correction audit log
-- ============================================================================
-- Records the before/after value of every existing mark that is changed.
-- New marks (first entry) are not corrections, so they are not logged.
--
-- Access rules:
--   - Staff may read their own corrections; admins may read everyone's.
--   - Inserts require actor_id = auth.uid().
--   - No UPDATE or DELETE policies: the log is append-only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mark_audit (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   timestamptz NOT NULL DEFAULT now(),
    assessment_id uuid NOT NULL REFERENCES public.assessments (id) ON DELETE CASCADE,
    student_id   uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
    actor_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    actor_role   text NOT NULL CHECK (actor_role IN ('admin', 'teacher')),
    old_marks    numeric(7, 2),
    new_marks    numeric(7, 2) NOT NULL,
    old_is_absent boolean NOT NULL,
    new_is_absent boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS mark_audit_assessment_idx
    ON public.mark_audit (assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mark_audit_actor_idx
    ON public.mark_audit (actor_id, created_at DESC);

ALTER TABLE public.mark_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY mark_audit_select
    ON public.mark_audit
    FOR SELECT
    TO authenticated
    USING (actor_id = auth.uid() OR public.is_admin());

CREATE POLICY mark_audit_insert
    ON public.mark_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid());

GRANT SELECT, INSERT ON public.mark_audit TO authenticated;
