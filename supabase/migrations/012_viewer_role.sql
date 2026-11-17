-- ============================================================================
-- SPIP Migration 012: read-only demo viewers + staff account management
-- ============================================================================
-- A new `viewer` role is for people who only want to LOOK at the project
-- (the public demo accounts). Viewers keep full read access because every
-- SELECT policy is already `TO authenticated USING (true)`, but they must
-- never be able to write.
--
-- Migrations 008-010 granted structure writes to `TO authenticated` with
-- `WITH CHECK (true)` — safe while only staff had logins, but NOT safe once
-- public demo logins exist. Those policies are re-created here with an
-- explicit role check, so the protection lives in the database, not just the
-- UI.
-- ============================================================================

-- 1. Widen the role check to include the read-only role ---------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'teacher', 'viewer'));

-- 2. Terms (was migration 008, WITH CHECK (true)) ---------------------------
DROP POLICY IF EXISTS terms_insert_staff ON public.academic_terms;
CREATE POLICY terms_insert_staff
    ON public.academic_terms FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS terms_update_staff ON public.academic_terms;
CREATE POLICY terms_update_staff
    ON public.academic_terms FOR UPDATE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'))
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS terms_delete_staff ON public.academic_terms;
CREATE POLICY terms_delete_staff
    ON public.academic_terms FOR DELETE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'));

-- 3. Subjects + enrolments (was migration 009) ------------------------------
DROP POLICY IF EXISTS subjects_insert_staff ON public.subjects;
CREATE POLICY subjects_insert_staff
    ON public.subjects FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS subjects_update_staff ON public.subjects;
CREATE POLICY subjects_update_staff
    ON public.subjects FOR UPDATE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'))
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS subjects_delete_staff ON public.subjects;
CREATE POLICY subjects_delete_staff
    ON public.subjects FOR DELETE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS enrollments_insert_staff ON public.enrollments;
CREATE POLICY enrollments_insert_staff
    ON public.enrollments FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS enrollments_update_staff ON public.enrollments;
CREATE POLICY enrollments_update_staff
    ON public.enrollments FOR UPDATE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'))
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS enrollments_delete_staff ON public.enrollments;
CREATE POLICY enrollments_delete_staff
    ON public.enrollments FOR DELETE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'));

-- 4. Assessments (was migration 010) ----------------------------------------
DROP POLICY IF EXISTS assessments_insert_staff ON public.assessments;
CREATE POLICY assessments_insert_staff
    ON public.assessments FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS assessments_update_staff ON public.assessments;
CREATE POLICY assessments_update_staff
    ON public.assessments FOR UPDATE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'))
    WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS assessments_delete_staff ON public.assessments;
CREATE POLICY assessments_delete_staff
    ON public.assessments FOR DELETE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'teacher'));

-- 5. Audit logs: only staff can ever write them -----------------------------
DROP POLICY IF EXISTS mark_audit_insert ON public.mark_audit;
CREATE POLICY mark_audit_insert
    ON public.mark_audit FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        AND public.get_user_role() IN ('admin', 'teacher')
    );

DROP POLICY IF EXISTS ai_insights_insert ON public.ai_insights;
CREATE POLICY ai_insights_insert
    ON public.ai_insights FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        AND public.get_user_role() IN ('admin', 'teacher')
    );

-- 6. The public demo accounts become permanent read-only viewers ------------
-- protect_profile_role() blocks role changes for non-admin callers, which is
-- correct at runtime but also fires for this migration. Disable it just for
-- this statement — this file runs as the project owner.
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_role;
UPDATE public.profiles
SET role = 'viewer'
WHERE email IN ('admin@college.edu', 'teacher@college.edu');
ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_role;
