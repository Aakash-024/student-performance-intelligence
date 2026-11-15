"""
Database Seeder for Student Performance Intelligence Platform (SPIP)
====================================================================
Reads synthetic CSV datasets and generates optimized batch SQL statements
for insertion into Supabase PostgreSQL.

Usage:
    python seed.py
"""

import os
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "generated")
OUTPUT_SQL_DIR = os.path.join(os.path.dirname(__file__), "sql_seeds")

os.makedirs(OUTPUT_SQL_DIR, exist_ok=True)

def escape_str(val):
    if pd.isna(val) or val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

def format_val(val, dtype="str"):
    if pd.isna(val) or val is None:
        return "NULL"
    if dtype == "bool":
        return "true" if str(val).lower() in ["true", "1", "t"] else "false"
    if dtype == "num":
        return str(val)
    return escape_str(val)

def generate_insert_batch(table, columns, rows, chunk_size=1000):
    """Generate multi-row INSERT statements."""
    statements = []
    col_str = ", ".join(columns)
    
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i + chunk_size]
        values_list = []
        for r in chunk:
            values_list.append(f"({', '.join(r)})")
        val_str = ",\n".join(values_list)
        sql = f"INSERT INTO public.{table} ({col_str})\nVALUES\n{val_str}\nON CONFLICT (id) DO NOTHING;"
        statements.append(sql)
    return statements

def main():
    print("=" * 60)
    print("Generating SPIP SQL Seed Scripts...")
    print("=" * 60)

    # 1. Departments
    dept_df = pd.read_csv(os.path.join(DATA_DIR, "departments.csv"))
    dept_rows = [[format_val(r["id"]), format_val(r["name"]), format_val(r["code"])] for _, r in dept_df.iterrows()]
    dept_sql = generate_insert_batch("departments", ["id", "name", "code"], dept_rows)

    # 2. Sections
    sec_df = pd.read_csv(os.path.join(DATA_DIR, "sections.csv"))
    sec_rows = [[format_val(r["id"]), format_val(r["department_id"]), format_val(r["name"]), format_val(r["year"], "num")] for _, r in sec_df.iterrows()]
    sec_sql = generate_insert_batch("sections", ["id", "department_id", "name", "year"], sec_rows)

    # 3. Subjects
    subj_df = pd.read_csv(os.path.join(DATA_DIR, "subjects.csv"))
    subj_rows = [[format_val(r["id"]), format_val(r["code"]), format_val(r["name"]), format_val(r["department_id"]), format_val(r["credits"], "num"), format_val(r["type"])] for _, r in subj_df.iterrows()]
    subj_sql = generate_insert_batch("subjects", ["id", "code", "name", "department_id", "credits", "type"], subj_rows)

    # 4. Academic Terms
    term_df = pd.read_csv(os.path.join(DATA_DIR, "academic_terms.csv"))
    term_rows = [[format_val(r["id"]), format_val(r["name"]), format_val(r["year"], "num"), format_val(r["semester"], "num"), format_val(r["start_date"]), format_val(r["end_date"]), format_val(r["is_current"], "bool")] for _, r in term_df.iterrows()]
    term_sql = generate_insert_batch("academic_terms", ["id", "name", "year", "semester", "start_date", "end_date", "is_current"], term_rows)

    # 5. Students
    stu_df = pd.read_csv(os.path.join(DATA_DIR, "students.csv"))
    stu_rows = [[format_val(r["id"]), format_val(r["register_number"]), format_val(r["name"]), format_val(r["email"]), format_val(r["section_id"]), format_val(r["current_year"], "num"), format_val(r["status"])] for _, r in stu_df.iterrows()]
    stu_sql = generate_insert_batch("students", ["id", "register_number", "name", "email", "section_id", "current_year", "status"], stu_rows)

    # 6. Enrollments (500 per chunk -> 3 chunks)
    enr_df = pd.read_csv(os.path.join(DATA_DIR, "enrollments.csv"))
    enr_rows = [[format_val(r["id"]), format_val(r["student_id"]), format_val(r["subject_id"]), format_val(r["academic_term_id"])] for _, r in enr_df.iterrows()]
    enr_sql = generate_insert_batch("enrollments", ["id", "student_id", "subject_id", "academic_term_id"], enr_rows, chunk_size=500)

    # 7. Assessments
    ass_df = pd.read_csv(os.path.join(DATA_DIR, "assessments.csv"))
    ass_rows = [[format_val(r["id"]), format_val(r["subject_id"]), format_val(r["academic_term_id"]), format_val(r["type"]), format_val(r["max_marks"], "num"), format_val(r["weightage_percent"], "num"), format_val(r["date"])] for _, r in ass_df.iterrows()]
    ass_sql = generate_insert_batch("assessments", ["id", "subject_id", "academic_term_id", "type", "max_marks", "weightage_percent", "date"], ass_rows)

    # 8. Marks (1000 per chunk -> 6 chunks)
    marks_df = pd.read_csv(os.path.join(DATA_DIR, "marks.csv"))
    marks_rows = [[format_val(r["id"]), format_val(r["student_id"]), format_val(r["assessment_id"]), format_val(r["marks_obtained"], "num"), format_val(r["is_absent"], "bool")] for _, r in marks_df.iterrows()]
    marks_sql = generate_insert_batch("marks", ["id", "student_id", "assessment_id", "marks_obtained", "is_absent"], marks_rows, chunk_size=1000)

    # 9. Attendance Sessions (all 360 in 1 chunk)
    sess_df = pd.read_csv(os.path.join(DATA_DIR, "attendance_sessions.csv"))
    sess_rows = [[format_val(r["id"]), format_val(r["subject_id"]), format_val(r["section_id"]), format_val(r["academic_term_id"]), format_val(r["session_date"]), format_val(r["period_number"], "num")] for _, r in sess_df.iterrows()]
    sess_sql = generate_insert_batch("attendance_sessions", ["id", "subject_id", "section_id", "academic_term_id", "session_date", "period_number"], sess_rows, chunk_size=1000)

    # 10. Attendance Records (3000 per chunk -> 6 chunks)
    att_df = pd.read_csv(os.path.join(DATA_DIR, "attendance_records.csv"))
    att_rows = [[format_val(r["id"]), format_val(r["attendance_session_id"]), format_val(r["student_id"]), format_val(r["is_present"], "bool")] for _, r in att_df.iterrows()]
    att_sql = generate_insert_batch("attendance_records", ["id", "attendance_session_id", "student_id", "is_present"], att_rows, chunk_size=3000)

    # Combine Phase 1 Base Data (departments, sections, subjects, terms, students, assessments, enrollments)
    base_sql = "\n\n".join(dept_sql + sec_sql + subj_sql + term_sql + stu_sql + ass_sql + enr_sql)
    with open(os.path.join(OUTPUT_SQL_DIR, "01_base_data.sql"), "w", encoding="utf-8") as f:
        f.write(base_sql)
    print("  ✓ 01_base_data.sql written (departments, sections, subjects, terms, students, assessments, enrollments)")

    # Phase 2 Marks Data
    with open(os.path.join(OUTPUT_SQL_DIR, "02_marks.sql"), "w", encoding="utf-8") as f:
        f.write("\n\n".join(marks_sql))
    print(f"  ✓ 02_marks.sql written ({len(marks_sql)} batches, {len(marks_df)} rows)")

    # Phase 3 Attendance Sessions
    with open(os.path.join(OUTPUT_SQL_DIR, "03_attendance_sessions.sql"), "w", encoding="utf-8") as f:
        f.write("\n\n".join(sess_sql))
    print(f"  ✓ 03_attendance_sessions.sql written ({len(sess_sql)} batches, {len(sess_df)} rows)")

    # Phase 4 Attendance Records
    with open(os.path.join(OUTPUT_SQL_DIR, "04_attendance_records.sql"), "w", encoding="utf-8") as f:
        f.write("\n\n".join(att_sql))
    print(f"  ✓ 04_attendance_records.sql written ({len(att_sql)} batches, {len(att_df)} rows)")

    print("\n✅ SQL Seed files generated in data/sql_seeds/")

if __name__ == "__main__":
    main()
