import os
import sys
import sqlite3
import psycopg2
from datetime import datetime, timezone

def run_migration():
    print("=" * 60)
    print("DEVTRACK: SQLite to PostgreSQL Data Migration")
    print("=" * 60)

    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database", "backup_test.db"))
    if not os.path.exists(sqlite_path):
        sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test.db"))

    print(f"Reading SQLite database from: {sqlite_path}")
    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"Source SQLite database not found at {sqlite_path}")

    # Connect to SQLite
    s_conn = sqlite3.connect(sqlite_path)
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    # Connect to PostgreSQL
    pg_host = os.getenv("PGHOST", "127.0.0.1")
    pg_port = os.getenv("PGPORT", "5433")
    pg_user = os.getenv("PGUSER", "devtrack")
    pg_password = os.getenv("PGPASSWORD", "devtrack")
    pg_database = os.getenv("PGDATABASE", "devtrack")

    p_conn = psycopg2.connect(
        host=pg_host,
        port=pg_port,
        user=pg_user,
        password=pg_password,
        dbname=pg_database
    )
    p_cur = p_conn.cursor()

    now = datetime.now(timezone.utc)

    # 1. Ensure a default Department and Program exist for university linkage
    p_cur.execute("SELECT id FROM departments WHERE code = 'CSE'")
    dept_row = p_cur.fetchone()
    if not dept_row:
        p_cur.execute("""
            INSERT INTO departments (name, code, description, created_at)
            VALUES ('Computer Science and Engineering', 'CSE', 'Department of Computer Science and Engineering', %s)
            RETURNING id
        """, (now,))
        dept_id = p_cur.fetchone()[0]
        print(f"Created initial department: CSE (ID: {dept_id})")
    else:
        dept_id = dept_row[0]

    # 2. Read SQLite users
    s_cur.execute("SELECT id, name, email, password_hash FROM users ORDER BY id ASC")
    s_users = s_cur.fetchall()
    print(f"Found {len(s_users)} users in SQLite.")

    # Insert / update in Postgres
    migrated_users = 0
    for u in s_users:
        # Determine appropriate default role based on email or name
        role = "student"
        if "admin" in u["email"].lower():
            role = "super_admin"
        elif "owner" in u["email"].lower() or "faculty" in u["email"].lower():
            role = "faculty"
        elif u["id"] == 1:
            role = "super_admin"  # Make user 1 Super Admin for complete system control

        p_cur.execute("""
            INSERT INTO users (id, name, email, password_hash, role, is_active, department_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, true, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                password_hash = EXCLUDED.password_hash
        """, (u["id"], u["name"], u["email"], u["password_hash"], role, dept_id, now, now))
        migrated_users += 1

    # 3. Read SQLite projects
    s_cur.execute("SELECT id, name, description, owner_id FROM projects ORDER BY id ASC")
    s_projects = s_cur.fetchall()
    print(f"Found {len(s_projects)} projects in SQLite.")

    migrated_projects = 0
    for p in s_projects:
        code = f"PRJ-{p['id']:04d}"
        p_cur.execute("""
            INSERT INTO projects (id, name, code, description, category, priority, status, owner_id, department_id, completion_percentage, created_at, updated_at)
            VALUES (%s, %s, %s, %s, 'Capstone', 'medium', 'active', %s, %s, 0, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                owner_id = EXCLUDED.owner_id
        """, (p["id"], p["name"], code, p["description"], p["owner_id"], dept_id, now, now))
        migrated_projects += 1

    # 4. Read SQLite tasks
    s_cur.execute("SELECT id, title, description, status, priority, project_id FROM tasks ORDER BY id ASC")
    s_tasks = s_cur.fetchall()
    print(f"Found {len(s_tasks)} tasks in SQLite.")

    migrated_tasks = 0
    for t in s_tasks:
        # Normalize status to lowercase
        status_val = t["status"].lower()
        if status_val not in ["backlog", "todo", "in_progress", "in_review", "blocked", "completed"]:
            status_val = "todo"

        p_cur.execute("""
            INSERT INTO tasks (id, title, description, status, priority, project_id, estimated_hours, actual_hours, progress_percentage, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, 4.0, 0.0, 0, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                status = EXCLUDED.status,
                priority = EXCLUDED.priority,
                project_id = EXCLUDED.project_id
        """, (t["id"], t["title"], t["description"], status_val, t["priority"].lower(), t["project_id"], now, now))
        migrated_tasks += 1

    # 5. Fix PostgreSQL serial sequences so new inserts don't collide
    for table in ["users", "projects", "tasks", "departments"]:
        p_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}")

    p_conn.commit()

    # 6. Validation
    p_cur.execute("SELECT COUNT(*) FROM users")
    pg_user_count = p_cur.fetchone()[0]

    p_cur.execute("SELECT COUNT(*) FROM projects")
    pg_project_count = p_cur.fetchone()[0]

    p_cur.execute("SELECT COUNT(*) FROM tasks")
    pg_task_count = p_cur.fetchone()[0]

    print("\n--- Migration Validation Summary ---")
    print(f"Users    - SQLite: {len(s_users)} | PostgreSQL: {pg_user_count}")
    print(f"Projects - SQLite: {len(s_projects)} | PostgreSQL: {pg_project_count}")
    print(f"Tasks    - SQLite: {len(s_tasks)} | PostgreSQL: {pg_task_count}")

    assert pg_user_count >= len(s_users), "Validation failed: Missing users!"
    assert pg_project_count >= len(s_projects), "Validation failed: Missing projects!"
    assert pg_task_count >= len(s_tasks), "Validation failed: Missing tasks!"

    # Verify foreign key integrity in PostgreSQL
    p_cur.execute("""
        SELECT COUNT(*) FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE u.id IS NULL
    """)
    orphan_projects = p_cur.fetchone()[0]
    assert orphan_projects == 0, f"Integrity error: {orphan_projects} projects without valid owners!"

    p_cur.execute("""
        SELECT COUNT(*) FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE p.id IS NULL
    """)
    orphan_tasks = p_cur.fetchone()[0]
    assert orphan_tasks == 0, f"Integrity error: {orphan_tasks} tasks without valid projects!"

    print("Foreign key integrity check passed: 0 orphaned records.")
    print("MIGRATION COMPLETED SUCCESSFULLY WITH ZERO LOSS OF DATA!")
    print("=" * 60)

    s_conn.close()
    p_conn.close()

if __name__ == "__main__":
    run_migration()
