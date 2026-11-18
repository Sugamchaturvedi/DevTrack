# DevTrack Architecture Reference

## Overview
DevTrack is a university-level project management system engineered with FastAPI, PostgreSQL, and Vanilla HTML5/CSS3/JavaScript.

## System Components
1. **Frontend**: Pure Vanilla JavaScript SPA using modular ES6 scripts in `frontend/js/`, CSS3 variables in `frontend/css/`, and entry point `frontend/devtrack.html`.
2. **Backend**: FastAPI REST API in `backend/app/` with Alembic database migrations.
3. **Database**: PostgreSQL relational schema supporting departments, academic programs, sessions, semesters, projects, tasks, sprints, submissions, evaluations, and notifications.
4. **RBAC**: 8 distinct roles (`super_admin`, `university_admin`, `hod`, `faculty`, `project_manager`, `team_leader`, `student`, `reviewer`).
