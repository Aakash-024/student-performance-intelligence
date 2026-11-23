-- ============================================================================
-- ACADNEX Migration 006: AI insights audit log (V2 Phase 4)
-- ============================================================================
-- Every AI agent interaction is recorded here. The agents are advisory: they
-- read RLS-scoped data and produce analysis, but nothing is written to
-- academic tables without a human acting separately.
--
-- Access rules:
--   - Every signed-in user may insert rows for themselves (the audit trail
--     records who asked for the insight).
--   - Users may read their own rows; admins may read everyone's.
--   - No UPDATE or DELETE policies: the log is append-only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       timestamptz NOT NULL DEFAULT now(),
    actor_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    actor_role       text NOT NULL CHECK (actor_role IN ('admin', 'teacher')),
    agent            text NOT NULL CHECK (agent IN ('risk_analysis', 'performance_analyst', 'recommendations', 'teacher_assistant', 'report_summary')),
    student_id       uuid REFERENCES public.students (id) ON DELETE SET NULL,
    model            text NOT NULL,
    prompt_summary   text NOT NULL,
    response_summary text NOT NULL,
    duration_ms      integer
);

CREATE INDEX IF NOT EXISTS ai_insights_actor_idx ON public.ai_insights (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_insights_student_idx ON public.ai_insights (student_id, created_at DESC);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_insights_select
    ON public.ai_insights
    FOR SELECT
    TO authenticated
    USING (actor_id = auth.uid() OR public.is_admin());

CREATE POLICY ai_insights_insert
    ON public.ai_insights
    FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid());

GRANT SELECT, INSERT ON public.ai_insights TO authenticated;
