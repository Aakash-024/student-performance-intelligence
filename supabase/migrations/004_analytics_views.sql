-- ============================================================================
-- ACADNEX Migration 004: Analytics views
-- ============================================================================
-- All views use security_invoker so the caller's RLS policies still apply.
-- Mark percentages are weighted by each assessment's weightage_percent.
-- ============================================================================

-- Per-student, per-subject, per-term weighted percentage
CREATE OR REPLACE VIEW public.v_student_subject_performance
WITH (security_invoker = on) AS
SELECT
    m.student_id,
    a.subject_id,
    a.academic_term_id,
    round(
        sum(
            CASE WHEN m.is_absent THEN 0
                 ELSE m.marks_obtained / a.max_marks * a.weightage_percent
            END
        ),
        2
    ) AS percentage,
    count(*) AS assessments_taken
FROM public.marks m
JOIN public.assessments a ON a.id = m.assessment_id
GROUP BY m.student_id, a.subject_id, a.academic_term_id;

-- Per-student, per-term attendance
CREATE OR REPLACE VIEW public.v_student_term_attendance
WITH (security_invoker = on) AS
SELECT
    ar.student_id,
    ses.academic_term_id,
    round(100.0 * count(*) FILTER (WHERE ar.is_present) / nullif(count(*), 0), 2) AS attendance_percentage,
    count(*) AS sessions_count
FROM public.attendance_records ar
JOIN public.attendance_sessions ses ON ses.id = ar.attendance_session_id
GROUP BY ar.student_id, ses.academic_term_id;

-- Per-student term summary
CREATE OR REPLACE VIEW public.v_student_term_performance
WITH (security_invoker = on) AS
SELECT
    p.student_id,
    p.academic_term_id,
    round(avg(p.percentage), 2) AS avg_percentage,
    count(*) AS subjects_count,
    count(*) FILTER (WHERE p.percentage >= 40) AS subjects_passed,
    coalesce(att.attendance_percentage, 0) AS attendance_percentage
FROM public.v_student_subject_performance p
LEFT JOIN public.v_student_term_attendance att
    ON att.student_id = p.student_id
   AND att.academic_term_id = p.academic_term_id
GROUP BY p.student_id, p.academic_term_id, att.attendance_percentage;

-- One row per active student with current-term metrics + rule-based indicator
CREATE OR REPLACE VIEW public.v_student_overview
WITH (security_invoker = on) AS
WITH current_term AS (
    SELECT id FROM public.academic_terms WHERE is_current LIMIT 1
),
previous_term AS (
    SELECT id FROM public.academic_terms
    WHERE NOT is_current
    ORDER BY start_date DESC
    LIMIT 1
),
cur AS (
    SELECT p.* FROM public.v_student_term_performance p
    JOIN current_term c ON c.id = p.academic_term_id
),
prev AS (
    SELECT p.student_id, p.avg_percentage
    FROM public.v_student_term_performance p
    JOIN previous_term c ON c.id = p.academic_term_id
)
SELECT
    s.id AS student_id,
    s.register_number,
    s.name,
    s.email,
    s.section_id,
    sec.name AS section_name,
    sec.year,
    coalesce(cur.avg_percentage, 0) AS avg_percentage,
    coalesce(cur.attendance_percentage, 0) AS attendance_percentage,
    prev.avg_percentage AS previous_percentage,
    coalesce(cur.subjects_passed, 0) AS subjects_passed,
    coalesce(cur.subjects_count, 0) AS subjects_count,
    round(coalesce(cur.avg_percentage, 0) - coalesce(prev.avg_percentage, 0), 2) AS change,
    CASE
        WHEN coalesce(cur.attendance_percentage, 0) < 60
          OR coalesce(cur.avg_percentage, 0) < 40 THEN 'at_risk'
        WHEN coalesce(cur.avg_percentage, 0) - coalesce(prev.avg_percentage, 0) <= -5 THEN 'declining'
        WHEN coalesce(cur.avg_percentage, 0) >= 75
          AND coalesce(cur.attendance_percentage, 0) >= 85 THEN 'high_performer'
        WHEN coalesce(cur.avg_percentage, 0) - coalesce(prev.avg_percentage, 0) >= 5 THEN 'improving'
        ELSE 'on_track'
    END AS indicator
FROM public.students s
JOIN public.sections sec ON sec.id = s.section_id
LEFT JOIN cur ON cur.student_id = s.id
LEFT JOIN prev ON prev.student_id = s.id
WHERE s.status = 'active';

-- Subject-level stats per term
CREATE OR REPLACE VIEW public.v_subject_term_performance
WITH (security_invoker = on) AS
SELECT
    a.subject_id,
    sub.code AS subject_code,
    sub.name AS subject_name,
    a.academic_term_id,
    round(avg(CASE WHEN m.is_absent THEN 0 ELSE m.marks_obtained / a.max_marks * 100 END), 2) AS avg_percentage,
    round(
        100.0 * count(*) FILTER (
            WHERE NOT m.is_absent AND (m.marks_obtained / a.max_marks * 100) >= 40
        ) / nullif(count(*), 0),
        2
    ) AS pass_rate,
    count(*) AS marks_count
FROM public.marks m
JOIN public.assessments a ON a.id = m.assessment_id
JOIN public.subjects sub ON sub.id = a.subject_id
GROUP BY a.subject_id, sub.code, sub.name, a.academic_term_id;

-- Section-level stats per term
CREATE OR REPLACE VIEW public.v_section_term_performance
WITH (security_invoker = on) AS
SELECT
    s.section_id,
    sec.name AS section_name,
    p.academic_term_id,
    round(avg(p.avg_percentage), 2) AS avg_percentage,
    round(avg(p.attendance_percentage), 2) AS attendance_percentage,
    count(*) AS student_count
FROM public.v_student_term_performance p
JOIN public.students s ON s.id = p.student_id
JOIN public.sections sec ON sec.id = s.section_id
GROUP BY s.section_id, sec.name, p.academic_term_id;

-- Attendance by subject/section for the current term (for attendance screens)
CREATE OR REPLACE VIEW public.v_session_attendance_summary
WITH (security_invoker = on) AS
SELECT
    ses.id AS session_id,
    ses.subject_id,
    ses.section_id,
    ses.academic_term_id,
    ses.session_date,
    ses.period_number,
    count(ar.id) AS student_count,
    count(ar.id) FILTER (WHERE ar.is_present) AS present_count
FROM public.attendance_sessions ses
LEFT JOIN public.attendance_records ar ON ar.attendance_session_id = ses.id
GROUP BY ses.id;

GRANT SELECT ON public.v_student_subject_performance TO authenticated;
GRANT SELECT ON public.v_student_term_attendance TO authenticated;
GRANT SELECT ON public.v_student_term_performance TO authenticated;
GRANT SELECT ON public.v_student_overview TO authenticated;
GRANT SELECT ON public.v_subject_term_performance TO authenticated;
GRANT SELECT ON public.v_section_term_performance TO authenticated;
GRANT SELECT ON public.v_session_attendance_summary TO authenticated;
