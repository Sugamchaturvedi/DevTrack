# DevTrack — Enterprise University Project Management System

DevTrack is a scalable, enterprise-grade, university-level project management platform designed for higher education institutions, academic colleges, and research universities.

---

## 1. System Architecture & Tech Stack

### Frontend — Pure Vanilla Web Stack
* **HTML5 & CSS3:** Semantic, accessible layout with CSS custom property design tokens.
* **Vanilla JavaScript (ES6+):** Modular client-side architecture without external frameworks (No React, Vite, Angular, Vue, Next.js, or TypeScript).
* **Responsive SaaS UI:** Mobile drawer, desktop sticky sidebar, top navigation bar, modal dialog system, and toast notifications.
* **Interactive Kanban & Charts:** Drag-and-drop Kanban workflow and HTML5 canvas sprint velocity burndown charts.
* **Theme Engine:** Built-in Light and Dark theme toggle with persistent user preference.

### Backend
* **Python & FastAPI:** Asynchronous, high-performance RESTful API architecture.
* **SQLAlchemy ORM 2.0:** Relational database mapping, connection pooling, and strict integrity constraints.
* **Alembic:** Structured database schema versioning and transactional migrations.
* **Authentication & RBAC:** Cryptographic password hashing (`bcrypt`) and stateless JSON Web Tokens (`python-jose`).
* **Input Validation:** Strict Pydantic v2 data models with detailed validation feedback.

### Database
* **PostgreSQL (Primary Application Database):** Production-grade relational storage with foreign keys, composite indexes, cascades, and sequential integrity.
* **SQLite Legacy Migration:** Automated script to back up SQLite databases and migrate existing users, projects, and tasks to PostgreSQL with zero data loss.

---

## 2. Institutional Hierarchy & Academic Programs

DevTrack structures university operations across four tiers:
1. **University Profile:** Institutional accreditation, identity, and global settings.
2. **Schools:** School of Computing, School of Engineering, School of Management.
3. **Academic Departments:** Computer Science & Engineering (CSE), Information Technology (IT), Electronics (ECE), Mechanical (MECH), Management (MBA).
4. **Degree Programs Supported:**
   - **B.Tech** (Computer Science, Electronics, Mechanical)
   - **M.Tech** (Software Engineering)
   - **BCA** (Bachelor of Computer Applications)
   - **MCA** (Master of Computer Applications)
   - **MBA** (Master of Business Administration)
   - **BBA**
   - **BA**
   - **MA**
   - **PhD** (Doctor of Philosophy in Computing)

---

## 3. Role-Based Access Control (RBAC)

The platform enforces 8 distinct operational roles on the backend:

| Role | Key Capabilities |
| :--- | :--- |
| **Super Admin** | Full platform control, audit logs, system-wide analytics, tenant settings |
| **University Admin** | Manage schools, departments, degree programs, academic sessions, and rosters |
| **Department Head (HOD)** | Department project governance, faculty workload distribution, review approvals |
| **Faculty / Mentor** | Supervise student project teams, create milestones, evaluate deliverables, rubric grading |
| **Project Reviewer** | External/internal evaluation committee member, blind reviews, grade submissions |
| **Project Manager** | Schedule sprints, allocate team resources, monitor Agile burndown velocity |
| **Team Leader** | Student capstone leader, distribute tasks, maintain deliverables, team coordination |
| **Student** | View assigned projects, Kanban task execution, file deliverables upload, view grades |

---

## 4. Key Functional Modules

1. **Executive Dashboards:** Real-time analytics queried directly from PostgreSQL based on the user's role (no mocked metrics).
2. **Projects Repository:** Filterable project directory with category (Capstone, Major, Minor, Research, Internship), priority, status, and CSV export.
3. **Interactive 6-Lane Kanban Board:** Drag-and-drop or select lane transition between `Backlog`, `To Do`, `In Progress`, `In Review`, `Blocked`, and `Completed`.
4. **Agile & Scrum Hub:** Sprint scheduling, product backlog user stories, and dynamic HTML5 canvas burndown charts.
5. **Academic Submissions & Grading:** Deliverable file uploads (PDF, DOCX, ZIP up to 25MB), GitHub repository link tracking, supervisor evaluations, marks, and rubric grade recording.
6. **Collaboration & Communications:** Project-specific discussion threads with nested replies, campus-wide announcements, and personal notification feeds.
7. **User Directory & Bulk Onboarding:** CSV bulk student/faculty onboarding, single-click CSV roster export, account activation/suspension toggles.

---

## 5. Quick Start & Execution

### Prerequisites
* Python 3.10+
* PostgreSQL 16+ (or Docker)

### Installation
```bash
# 1. Clone repository
git clone https://github.com/Sugamchaturvedi/DevTrack.git
cd DevTrack

# 2. Set up Python virtual environment
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
# source venv/bin/activate # On Linux/macOS

# 3. Install dependencies
pip install -r requirements.txt
```

### PostgreSQL Setup & Database Migration
```bash
# Configure .env from .env.example
cp .env.example .env

# Run Alembic migrations to build PostgreSQL schema
alembic upgrade head

# Seed university departments, degree programs, and demo accounts
python scripts/seed_university_data.py
```

### Launch DevTrack

#### Option A: Unified Launcher (Easiest on Windows)
Simply double-click `run_devtrack.bat` or run:
```powershell
.\run_devtrack.bat
```
*(Automatically verifies database status, starts the backend, and opens your browser.)*

#### Option B: Direct FastAPI Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload
```
Open [http://127.0.0.1:8000/devtrack.html](http://127.0.0.1:8000/devtrack.html) in your browser.

#### Option C: VS Code Live Server
1. Ensure the backend server is running on port 8000.
2. Right-click `frontend/devtrack.html` -> *Open with Live Server* (`http://127.0.0.1:5501/devtrack.html`).

---

## 6. Demonstration Accounts (All Passwords: `DevTrack@123`)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@devtrack.edu` | `DevTrack@123` |
| **University Admin** | `univ.admin@devtrack.edu` | `DevTrack@123` |
| **HOD (Computer Science)** | `hod.cse@devtrack.edu` | `DevTrack@123` |
| **Faculty Mentor** | `faculty.mehta@devtrack.edu` | `DevTrack@123` |
| **Project Reviewer** | `reviewer.prof@devtrack.edu` | `DevTrack@123` |
| **Project Manager** | `pm.kavita@devtrack.edu` | `DevTrack@123` |
| **Team Leader** | `lead.rahul@devtrack.edu` | `DevTrack@123` |
| **Student** | `student.priya@devtrack.edu` | `DevTrack@123` |

---

## 7. Interactive API Documentation

Interactive Swagger documentation is automatically available at:
* **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 8. Running Automated Test Suite

```bash
# Run full pytest suite across auth, RBAC, projects, tasks, and system integration
pytest backend/tests -v
```
