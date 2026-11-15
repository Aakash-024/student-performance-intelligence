-- ============================================================================
-- SPIP Migration 005: Assessment summary view
-- ============================================================================
-- One row per assessment with recorded-mark statistics, so the assessments
-- screen can show coverage and averages without loading every mark row.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_assessment_summary
WITH (security_invoker = on) AS
SELECT
    a.id AS assessment_id,
    a.subject_id,
    a.academic_term_id,
    count(m.id) AS marks_count,
    count(m.id) FILTER (WHERE m.is_absent) AS absent_count,
    round(
        avg(
            CASE
                WHEN m.id IS NULL THEN NULL
                WHEN m.is_absent THEN 0
                ELSE m.marks_obtained / a.max_marks * 100
            END
        ),
        2
    ) AS avg_percentage
FROM public.assessments a
LEFT JOIN public.marks m ON m.assessment_id = a.id
GROUP BY a.id, a.subject_id, a.academic_term_id;

GRANT SELECT ON public.v_assessment_summary TO authenticated;

-- Attendance session summary already exists as v_session_attendance_summary.
