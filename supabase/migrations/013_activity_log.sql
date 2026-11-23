-- ============================================================================
-- ACADNEX Migration 013: general activity log (who did what, when)
-- ============================================================================
-- One append-only row per write action performed through the app: student,
-- term, subject, enrolment, assessment, marks, attendance, CSV import and
-- account changes.
--
-- Design notes:
--   - `entity_label` and `actor_name` are denormalised ON PURPOSE so the log
--     stays readable even after the referenced student/subject/account is
--     deleted.
--   - `details` holds structured before/after payloads for edits.
--   - No UPDATE or DELETE policies: the log is append-only, like mark_audit.
--   - Viewers (demo accounts) cannot read or write this table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   timestamptz NOT NULL DEFAULT now(),
    actor_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    actor_role   text NOT NULL CHECK (actor_role IN ('admin', 'teacher')),
    actor_name   text NOT NULL,
    action       text NOT NULL,
    entity_type  text NOT NULL,
    entity_id    text,
    entity_label text NOT NULL,
    summary      text NOT NULL,
    details      jsonb
);

CREATE INDEX IF NOT EXISTS activity_log_created_idx
    ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_actor_idx
    ON public.activity_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action_idx
    ON public.activity_log (action);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_log_select_staff
    ON public.activity_log
    FOR SELECT
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'));

CREATE POLICY activity_log_insert_staff
    ON public.activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        AND public.get_user_role() IN ('admin', 'teacher')
    );
