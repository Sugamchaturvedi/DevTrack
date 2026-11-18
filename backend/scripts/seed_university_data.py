import os
import psycopg2
from datetime import datetime, timedelta, timezone
from app.core.security import hash_password

def seed_data():
    print("Seeding university metadata, programs, semesters, and demonstration accounts...")
    pg_host = os.getenv("PGHOST", "127.0.0.1")
    pg_port = os.getenv("PGPORT", "5433")
    pg_user = os.getenv("PGUSER", "devtrack")
    pg_password = os.getenv("PGPASSWORD", "devtrack")
    pg_database = os.getenv("PGDATABASE", "devtrack")

    conn = psycopg2.connect(
        host=pg_host,
        port=pg_port,
        user=pg_user,
        password=pg_password,
        dbname=pg_database
    )
    cur = conn.cursor()
    now = datetime.now(timezone.utc)

    # 1. University Profile
    cur.execute("SELECT id FROM university_profiles LIMIT 1")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO university_profiles (name, code, address, contact_email, contact_phone, website, created_at)
            VALUES ('Apex National Institute of Technology', 'ANIT', 'University Road, Knowledge City, Tech Hub', 'contact@anit.edu', '+91 9876543210', 'https://anit.edu', %s)
        """, (now,))

    # 2. Schools
    schools = [
        ("School of Computing & Information Technology", "SCIT", "School of Computing"),
        ("School of Engineering & Applied Sciences", "SEAS", "School of Engineering"),
        ("School of Management & Business Studies", "SMBS", "School of Management"),
    ]
    school_ids = {}
    for name, code, desc in schools:
        cur.execute("SELECT id FROM schools WHERE code = %s", (code,))
        row = cur.fetchone()
        if row:
            school_ids[code] = row[0]
        else:
            cur.execute("""
                INSERT INTO schools (name, code, description, created_at)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (name, code, desc, now))
            school_ids[code] = cur.fetchone()[0]

    # 3. Departments
    depts = [
        ("Computer Science & Engineering", "CSE", school_ids.get("SCIT")),
        ("Information Technology", "IT", school_ids.get("SCIT")),
        ("Electronics & Communication", "ECE", school_ids.get("SEAS")),
        ("Mechanical Engineering", "MECH", school_ids.get("SEAS")),
        ("Management Studies", "MBA-DEPT", school_ids.get("SMBS")),
    ]
    dept_ids = {}
    for name, code, s_id in depts:
        cur.execute("SELECT id FROM departments WHERE code = %s", (code,))
        row = cur.fetchone()
        if row:
            dept_ids[code] = row[0]
        else:
            cur.execute("""
                INSERT INTO departments (name, code, school_id, created_at)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (name, code, s_id, now))
            dept_ids[code] = cur.fetchone()[0]

    # 4. Academic Programs (B.Tech, M.Tech, BCA, MCA, MBA, BBA, BA, MA, PhD)
    programs = [
        ("B.Tech in Computer Science & Engineering", "BTECH-CSE", "B.Tech", 4, dept_ids.get("CSE")),
        ("B.Tech in Electronics & Communication", "BTECH-ECE", "B.Tech", 4, dept_ids.get("ECE")),
        ("B.Tech in Mechanical Engineering", "BTECH-MECH", "B.Tech", 4, dept_ids.get("MECH")),
        ("M.Tech in Software Engineering", "MTECH-SE", "M.Tech", 2, dept_ids.get("CSE")),
        ("Bachelor of Computer Applications", "BCA", "BCA", 3, dept_ids.get("IT")),
        ("Master of Computer Applications", "MCA", "MCA", 2, dept_ids.get("IT")),
        ("Master of Business Administration", "MBA", "MBA", 2, dept_ids.get("MBA-DEPT")),
        ("Bachelor of Business Administration", "BBA", "BBA", 3, dept_ids.get("MBA-DEPT")),
        ("Ph.D. in Computer Science", "PHD-CS", "PhD", 3, dept_ids.get("CSE")),
    ]
    program_ids = {}
    for name, code, deg, dur, d_id in programs:
        cur.execute("SELECT id FROM programs WHERE code = %s", (code,))
        row = cur.fetchone()
        if row:
            program_ids[code] = row[0]
        else:
            cur.execute("""
                INSERT INTO programs (name, code, degree_type, duration_years, department_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (name, code, deg, dur, d_id, now))
            program_ids[code] = cur.fetchone()[0]

    # 5. Academic Sessions
    cur.execute("SELECT id FROM academic_sessions WHERE name = '2025-2026'")
    session_row = cur.fetchone()
    if session_row:
        session_id = session_row[0]
    else:
        cur.execute("""
            INSERT INTO academic_sessions (name, start_year, end_year, is_current, created_at)
            VALUES ('2025-2026', 2025, 2026, true, %s) RETURNING id
        """, (now,))
        session_id = cur.fetchone()[0]

    # 6. Semesters
    btech_cse_id = program_ids.get("BTECH-CSE")
    semester_ids = {}
    if btech_cse_id:
        for sem_num in range(1, 9):
            sem_name = f"Semester {sem_num}"
            cur.execute("SELECT id FROM semesters WHERE program_id = %s AND semester_number = %s", (btech_cse_id, sem_num))
            s_row = cur.fetchone()
            if s_row:
                semester_ids[sem_num] = s_row[0]
            else:
                cur.execute("""
                    INSERT INTO semesters (program_id, academic_session_id, semester_number, name, created_at)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id
                """, (btech_cse_id, session_id, sem_num, sem_name, now))
                semester_ids[sem_num] = cur.fetchone()[0]

    # 7. Demo Users for all 8 Roles
    default_pw = hash_password("DevTrack@123")
    role_users = [
        ("Platform Administrator", "admin@devtrack.edu", "super_admin", dept_ids.get("CSE")),
        ("Dr. Vikram Sharma", "univ.admin@devtrack.edu", "university_admin", dept_ids.get("CSE")),
        ("Prof. Aruna Desai", "hod.cse@devtrack.edu", "hod", dept_ids.get("CSE")),
        ("Dr. Rajesh Mehta", "faculty.mehta@devtrack.edu", "faculty", dept_ids.get("CSE")),
        ("Prof. Sunita Rao", "reviewer.prof@devtrack.edu", "reviewer", dept_ids.get("CSE")),
        ("Kavita Nair", "pm.kavita@devtrack.edu", "project_manager", dept_ids.get("CSE")),
        ("Rahul Verma", "lead.rahul@devtrack.edu", "team_leader", dept_ids.get("CSE")),
        ("Priya Sharma", "student.priya@devtrack.edu", "student", dept_ids.get("CSE")),
        ("Amit Patel", "student.amit@devtrack.edu", "student", dept_ids.get("CSE")),
    ]

    user_map = {}
    for name, email, role, d_id in role_users:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if row:
            u_id = row[0]
            cur.execute("UPDATE users SET role = %s, department_id = %s, password_hash = %s WHERE id = %s", (role, d_id, default_pw, u_id))
        else:
            cur.execute("""
                INSERT INTO users (name, email, password_hash, role, department_id, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, true, %s, %s) RETURNING id
            """, (name, email, default_pw, role, d_id, now, now))
            u_id = cur.fetchone()[0]
        user_map[role] = u_id

    # 8. Create Profiles
    # Faculty profiles
    for role_name, emp_id, desig in [
        ("hod", "FAC-001", "Professor & Head of Department"),
        ("faculty", "FAC-002", "Associate Professor"),
        ("reviewer", "FAC-003", "Professor & External Evaluator")
    ]:
        u_id = user_map.get(role_name)
        if u_id:
            cur.execute("SELECT id FROM faculty_profiles WHERE user_id = %s", (u_id,))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO faculty_profiles (user_id, employee_id, department_id, designation, specialization, max_project_load, current_project_load, created_at)
                    VALUES (%s, %s, %s, %s, 'Software Systems & AI', 8, 3, %s)
                """, (u_id, emp_id, dept_ids.get("CSE"), desig, now))

    # Student profiles
    sem7_id = semester_ids.get(7)
    for email, enroll_no, cgpa in [
        ("lead.rahul@devtrack.edu", "BT22CSE045", 8.85),
        ("student.priya@devtrack.edu", "BT22CSE046", 9.12),
        ("student.amit@devtrack.edu", "BT22CSE047", 8.40)
    ]:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        u_row = cur.fetchone()
        if u_row:
            u_id = u_row[0]
            cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (u_id,))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO student_profiles (user_id, enrollment_number, program_id, department_id, semester_id, batch_year, cgpa, academic_status, created_at)
                    VALUES (%s, %s, %s, %s, %s, 2022, %s, 'active', %s)
                """, (u_id, enroll_no, btech_cse_id, dept_ids.get("CSE"), sem7_id, cgpa, now))

    # 9. Campus Announcements
    admin_id = user_map.get("super_admin") or 1
    cur.execute("SELECT COUNT(*) FROM announcements")
    if cur.fetchone()[0] == 0:
        cur.execute("""
            INSERT INTO announcements (title, content, target_role, created_by_id, created_at)
            VALUES 
            ('Capstone Project Final Submission Guidelines', 'All final year B.Tech & MCA students must submit their complete documentation and GitHub repo link by the announced deadline.', 'all', %s, %s),
            ('Mid-Term Project Evaluation Schedule', 'Evaluation committee reviews commence next Monday in the Computing Lab. Ensure code demos are prepared.', 'student', %s, %s),
            ('Faculty Mentorship Progress Reports Due', 'Department HOD requests all project mentors to review sprint backlogs and approve initial architecture drafts.', 'faculty', %s, %s)
        """, (admin_id, now, admin_id, now, admin_id, now))

    # 10. Notifications
    admin_id = user_map.get("super_admin")
    if admin_id:
        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s", (admin_id,))
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO notifications (user_id, title, message, notification_type, is_read, created_at)
                VALUES 
                (%s, 'System Initialized', 'DevTrack University Project Management System successfully configured with PostgreSQL.', 'info', false, %s),
                (%s, 'New Academic Session Active', 'Session 2025-2026 is currently active with 9 programs.', 'info', false, %s)
            """, (admin_id, now, admin_id, now))

    conn.commit()
    conn.close()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_data()
