"""
Synthetic Data Generator for Student Performance Intelligence Platform (SPIP)
=============================================================================
Generates realistic, reproducible academic data for demonstration purposes.

Usage:
    python generate_data.py

Output:
    generated/students.csv
    generated/subjects.csv
    generated/enrollments.csv
    generated/marks.csv
    generated/attendance.csv
    generated/academic_history.csv

All data is SYNTHETIC and for demonstration only.
"""

import os
import uuid
import random
from datetime import date, timedelta

import numpy as np
import pandas as pd
from faker import Faker

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SEED = 42
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "generated")

NUM_STUDENTS = 150
SECTIONS = ["A", "B", "C"]
CURRENT_YEAR = 2  # 2nd year students

# Student profile distribution
PROFILES = {
    "high_performer":   25,
    "average":          50,
    "improving":        20,
    "declining":        15,
    "low_attendance":   15,
    "inconsistent":     25,
}

SUBJECTS = [
    {"code": "CS201", "name": "Data Structures and Algorithms", "credits": 4, "type": "theory", "difficulty": 0.6},
    {"code": "CS202", "name": "Object Oriented Programming",   "credits": 4, "type": "theory", "difficulty": 0.4},
    {"code": "CS203", "name": "Database Management Systems",    "credits": 3, "type": "theory", "difficulty": 0.5},
    {"code": "CS204", "name": "Computer Networks",              "credits": 3, "type": "theory", "difficulty": 0.55},
    {"code": "CS205", "name": "Data Structures Lab",            "credits": 2, "type": "lab",    "difficulty": 0.35},
]

ASSESSMENTS = [
    {"type": "cat1",     "max_marks": 50,  "weightage": 25},
    {"type": "cat2",     "max_marks": 50,  "weightage": 25},
    {"type": "semester", "max_marks": 100, "weightage": 50},
]

SEMESTERS = [
    {"name": "Semester 3", "year": 2025, "semester": 1, "start": "2025-07-15", "end": "2025-12-15"},
    {"name": "Semester 4", "year": 2025, "semester": 2, "start": "2026-01-10", "end": "2026-06-10"},
]

# Attendance sessions per subject per semester (12 sessions x 5 subjects x 3 sections = 180/sem)
SESSIONS_PER_SUBJECT = 12

# ---------------------------------------------------------------------------
# Deterministic setup
# ---------------------------------------------------------------------------
random.seed(SEED)
np.random.seed(SEED)
fake = Faker("en_IN")
Faker.seed(SEED)

os.makedirs(OUTPUT_DIR, exist_ok=True)


_uuid_counter = 0

def gen_uuid(prefix="spip") -> str:
    """Generate a deterministic UUID."""
    global _uuid_counter
    _uuid_counter += 1
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{prefix}_{_uuid_counter}"))


# ---------------------------------------------------------------------------
# Departments & Sections
# ---------------------------------------------------------------------------
DEPARTMENT_ID = gen_uuid()
DEPARTMENT = {"id": DEPARTMENT_ID, "name": "Computer Science and Engineering", "code": "CSE"}

section_records = []
for sec_name in SECTIONS:
    section_records.append({
        "id": gen_uuid(),
        "department_id": DEPARTMENT_ID,
        "name": sec_name,
        "year": CURRENT_YEAR,
    })


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------
def generate_students() -> pd.DataFrame:
    """Generate 150 students with assigned profiles and sections."""
    students = []
    profile_pool: list[str] = []
    for profile, count in PROFILES.items():
        profile_pool.extend([profile] * count)
    random.shuffle(profile_pool)

    section_ids = [s["id"] for s in section_records]
    for i, profile in enumerate(profile_pool):
        section_id = section_ids[i % len(section_ids)]
        section_name = SECTIONS[i % len(SECTIONS)]
        reg_prefix = f"2024CSE{section_name}"
        reg_num = f"{reg_prefix}{i + 1:03d}"

        students.append({
            "id": gen_uuid(),
            "register_number": reg_num,
            "name": fake.name(),
            "email": f"{reg_num.lower()}@college.edu",
            "section_id": section_id,
            "current_year": CURRENT_YEAR,
            "status": "active",
            "profile": profile,  # kept for generation; stripped from final CSV
        })

    return pd.DataFrame(students)


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------
def generate_subjects() -> pd.DataFrame:
    rows = []
    for subj in SUBJECTS:
        rows.append({
            "id": gen_uuid(),
            "code": subj["code"],
            "name": subj["name"],
            "department_id": DEPARTMENT_ID,
            "credits": subj["credits"],
            "type": subj["type"],
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Academic Terms
# ---------------------------------------------------------------------------
def generate_terms() -> pd.DataFrame:
    rows = []
    for sem in SEMESTERS:
        rows.append({
            "id": gen_uuid(),
            "name": sem["name"],
            "year": sem["year"],
            "semester": sem["semester"],
            "start_date": sem["start"],
            "end_date": sem["end"],
            "is_current": sem == SEMESTERS[-1],
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Enrollments (every student × every subject × every term)
# ---------------------------------------------------------------------------
def generate_enrollments(students: pd.DataFrame, subjects: pd.DataFrame,
                         terms: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, student in students.iterrows():
        for _, subj in subjects.iterrows():
            for _, term in terms.iterrows():
                rows.append({
                    "id": gen_uuid(),
                    "student_id": student["id"],
                    "subject_id": subj["id"],
                    "academic_term_id": term["id"],
                })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Assessments (per subject × per term)
# ---------------------------------------------------------------------------
def generate_assessments(subjects: pd.DataFrame, terms: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, subj in subjects.iterrows():
        for _, term in terms.iterrows():
            base_date = pd.to_datetime(term["start_date"]).date()
            for j, assess in enumerate(ASSESSMENTS):
                rows.append({
                    "id": gen_uuid(),
                    "subject_id": subj["id"],
                    "academic_term_id": term["id"],
                    "type": assess["type"],
                    "max_marks": assess["max_marks"],
                    "weightage_percent": assess["weightage"],
                    "date": str(base_date + timedelta(days=30 * (j + 1))),
                })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Marks — profile-aware generation
# ---------------------------------------------------------------------------
def _base_score(profile: str, semester_idx: int, difficulty: float) -> tuple[float, float]:
    """Return (mean_pct, std_pct) for a profile in a given semester."""
    diff_penalty = difficulty * 10  # harder subjects pull scores down

    if profile == "high_performer":
        mean = 87 - diff_penalty
        std = 5
    elif profile == "average":
        mean = 65 - diff_penalty
        std = 8
    elif profile == "improving":
        mean = (48 + semester_idx * 18) - diff_penalty
        std = 7
    elif profile == "declining":
        mean = (78 - semester_idx * 18) - diff_penalty
        std = 7
    elif profile == "low_attendance":
        mean = 50 - diff_penalty
        std = 12
    elif profile == "inconsistent":
        mean = 62 - diff_penalty
        std = 18
    else:
        mean = 60
        std = 10

    return max(mean, 15), std


def _generate_mark(max_marks: float, mean_pct: float, std_pct: float,
                   assess_type: str) -> float:
    """Generate a single mark value."""
    pct = np.random.normal(mean_pct, std_pct)
    # Slight boost for semester exams (students study harder)
    if assess_type == "semester":
        pct += np.random.uniform(0, 5)
    # Labs are generally easier
    pct = np.clip(pct, 5, 98)
    raw = (pct / 100) * max_marks
    return round(max(0, min(raw, max_marks)), 1)


def generate_marks(students: pd.DataFrame, assessments: pd.DataFrame,
                   terms: pd.DataFrame, subjects: pd.DataFrame) -> pd.DataFrame:
    rows = []
    term_ids = list(terms["id"])
    subj_difficulty = {s["code"]: s["difficulty"] for s in SUBJECTS}
    
    # Merge assessments with actual subjects dataframe passed in
    assess_subj = assessments.merge(
        subjects[["id", "code"]].rename(columns={"id": "subject_id"}),
        on="subject_id",
        how="left"
    )

    for _, student in students.iterrows():
        profile = student["profile"]
        for _, assess_row in assess_subj.iterrows():
            sem_idx = term_ids.index(assess_row["academic_term_id"])
            code = assess_row["code"]
            diff = subj_difficulty.get(code, 0.5)

            mean_pct, std_pct = _base_score(profile, sem_idx, diff)

            # Low attendance students occasionally miss exams
            is_absent = False
            if profile == "low_attendance" and random.random() < 0.08:
                is_absent = True

            marks_val = 0.0 if is_absent else _generate_mark(
                assess_row["max_marks"], mean_pct, std_pct, assess_row["type"]
            )

            rows.append({
                "id": gen_uuid(),
                "student_id": student["id"],
                "assessment_id": assess_row["id"],
                "marks_obtained": marks_val,
                "is_absent": is_absent,
            })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Attendance — profile-aware
# ---------------------------------------------------------------------------
def _attendance_rate(profile: str) -> float:
    """Return target attendance percentage for a profile."""
    rates = {
        "high_performer": 0.92,
        "average":        0.80,
        "improving":      0.78,
        "declining":      0.72,
        "low_attendance": 0.55,
        "inconsistent":   0.75,
    }
    base = rates.get(profile, 0.78)
    return np.clip(base + np.random.normal(0, 0.04), 0.30, 0.99)


def generate_attendance(students: pd.DataFrame, subjects: pd.DataFrame,
                        terms: pd.DataFrame, sections: list[dict]) -> pd.DataFrame:
    sessions_rows = []
    records_rows = []

    section_id_map = {s["id"]: s for s in sections}

    for _, term in terms.iterrows():
        start = pd.to_datetime(term["start_date"]).date()
        for _, subj in subjects.iterrows():
            for sec in sections:
                for day_offset in range(SESSIONS_PER_SUBJECT):
                    sess_date = start + timedelta(days=day_offset * 3)  # ~3 day gap
                    period = random.randint(1, 6)
                    session_id = gen_uuid()
                    sessions_rows.append({
                        "id": session_id,
                        "subject_id": subj["id"],
                        "section_id": sec["id"],
                        "academic_term_id": term["id"],
                        "session_date": str(sess_date),
                        "period_number": period,
                    })

                    # Generate attendance records for students in this section
                    section_students = students[students["section_id"] == sec["id"]]
                    for _, student in section_students.iterrows():
                        rate = _attendance_rate(student["profile"])
                        is_present = random.random() < rate
                        records_rows.append({
                            "id": gen_uuid(),
                            "attendance_session_id": session_id,
                            "student_id": student["id"],
                            "is_present": is_present,
                        })

    sessions_df = pd.DataFrame(sessions_rows)
    records_df = pd.DataFrame(records_rows)
    return sessions_df, records_df


# ---------------------------------------------------------------------------
# Academic History (semester-level summaries)
# ---------------------------------------------------------------------------
def generate_academic_history(students: pd.DataFrame, marks_df: pd.DataFrame,
                              assessments: pd.DataFrame, terms: pd.DataFrame,
                              attendance_records: pd.DataFrame,
                              attendance_sessions: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, term in terms.iterrows():
        term_assessments = assessments[assessments["academic_term_id"] == term["id"]]
        term_assess_ids = set(term_assessments["id"])
        term_sessions = attendance_sessions[attendance_sessions["academic_term_id"] == term["id"]]
        term_session_ids = set(term_sessions["id"])

        for _, student in students.iterrows():
            # Calculate weighted average
            student_marks = marks_df[
                (marks_df["student_id"] == student["id"]) &
                (marks_df["assessment_id"].isin(term_assess_ids))
            ]

            if len(student_marks) == 0:
                continue

            # Merge to get max_marks and weightage
            merged = student_marks.merge(
                term_assessments[["id", "max_marks", "weightage_percent"]],
                left_on="assessment_id", right_on="id", suffixes=("", "_assess")
            )
            if len(merged) == 0:
                continue

            # Weighted percentage
            merged["pct"] = (merged["marks_obtained"] / merged["max_marks"]) * 100
            avg_pct = merged["pct"].mean()

            # Attendance for this term
            student_att = attendance_records[
                (attendance_records["student_id"] == student["id"]) &
                (attendance_records["attendance_session_id"].isin(term_session_ids))
            ]
            total_sessions = len(student_att)
            present_count = student_att["is_present"].sum() if total_sessions > 0 else 0
            att_pct = (present_count / total_sessions * 100) if total_sessions > 0 else 0

            rows.append({
                "id": gen_uuid(),
                "student_id": student["id"],
                "academic_term_id": term["id"],
                "average_percentage": round(avg_pct, 2),
                "attendance_percentage": round(att_pct, 2),
                "total_subjects": len(SUBJECTS),
                "subjects_passed": int((merged.groupby("assessment_id")["pct"].mean() >= 40).sum()),
            })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("SPIP Synthetic Data Generator")
    print("=" * 60)

    print("\n[1/7] Generating students...")
    students_df = generate_students()

    print("[2/7] Generating subjects...")
    subjects_df = generate_subjects()

    print("[3/7] Generating academic terms...")
    terms_df = generate_terms()

    print("[4/7] Generating enrollments...")
    enrollments_df = generate_enrollments(students_df, subjects_df, terms_df)

    print("[5/7] Generating assessments and marks...")
    assessments_df = generate_assessments(subjects_df, terms_df)
    marks_df = generate_marks(students_df, assessments_df, terms_df, subjects_df)

    print("[6/7] Generating attendance records...")
    sessions_df, records_df = generate_attendance(students_df, subjects_df, terms_df, section_records)

    print("[7/7] Generating academic history summaries...")
    history_df = generate_academic_history(
        students_df, marks_df, assessments_df, terms_df, records_df, sessions_df
    )

    # -----------------------------------------------------------------------
    # Save CSV files
    # -----------------------------------------------------------------------
    # Strip internal 'profile' column from students before saving
    students_export = students_df.drop(columns=["profile"])

    departments_df = pd.DataFrame([DEPARTMENT])
    sections_df = pd.DataFrame(section_records)

    files = {
        "departments.csv": departments_df,
        "sections.csv": sections_df,
        "students.csv": students_export,
        "subjects.csv": subjects_df,
        "academic_terms.csv": terms_df,
        "enrollments.csv": enrollments_df,
        "assessments.csv": assessments_df,
        "marks.csv": marks_df,
        "attendance_sessions.csv": sessions_df,
        "attendance_records.csv": records_df,
        "academic_history.csv": history_df,
    }

    # Also save internal reference with profiles for validation
    profile_ref = students_df[["id", "register_number", "name", "profile"]]

    print("\n--- Saving CSV files ---")
    for filename, df in files.items():
        path = os.path.join(OUTPUT_DIR, filename)
        df.to_csv(path, index=False)
        print(f"  ✓ {filename}: {len(df):,} rows")

    profile_path = os.path.join(OUTPUT_DIR, "_student_profiles_reference.csv")
    profile_ref.to_csv(profile_path, index=False)
    print(f"  ✓ _student_profiles_reference.csv: {len(profile_ref):,} rows (internal)")

    # -----------------------------------------------------------------------
    # Summary Statistics
    # -----------------------------------------------------------------------
    print("\n--- Data Summary ---")
    print(f"  Students:            {len(students_df):>6,}")
    print(f"  Subjects:            {len(subjects_df):>6,}")
    print(f"  Academic Terms:      {len(terms_df):>6,}")
    print(f"  Enrollments:         {len(enrollments_df):>6,}")
    print(f"  Assessments:         {len(assessments_df):>6,}")
    print(f"  Marks:               {len(marks_df):>6,}")
    print(f"  Attendance Sessions: {len(sessions_df):>6,}")
    print(f"  Attendance Records:  {len(records_df):>6,}")
    print(f"  Academic History:    {len(history_df):>6,}")

    # Profile distribution
    print("\n--- Student Profile Distribution ---")
    for profile, count in students_df["profile"].value_counts().items():
        print(f"  {profile:<20s} {count:>3d}")

    # Quick marks stats
    print("\n--- Marks Statistics ---")
    avg_marks = marks_df[~marks_df["is_absent"]]["marks_obtained"].mean()
    absent_count = marks_df["is_absent"].sum()
    print(f"  Average marks obtained: {avg_marks:.1f}")
    print(f"  Absent entries:         {absent_count}")

    # Quick attendance stats
    print("\n--- Attendance Statistics ---")
    att_rate = records_df["is_present"].mean() * 100
    print(f"  Overall attendance rate: {att_rate:.1f}%")

    print("\n✅ All synthetic data generated successfully!")
    print(f"   Output directory: {os.path.abspath(OUTPUT_DIR)}")
    print("\n⚠️  This data is SYNTHETIC and for demonstration purposes only.")


if __name__ == "__main__":
    main()
