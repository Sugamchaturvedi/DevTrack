# DevTrack

DevTrack is a full-stack project and task management application that helps users organize projects and manage tasks through a simple web-based dashboard.

The application provides user authentication, project creation, task management, task status and priority tracking, protected APIs, and database-backed data management.

## Features

- User registration and login
- Secure authentication using JWT
- Protected project and task APIs
- User-based project ownership
- Create and manage projects
- Create and manage tasks
- Task status management
  - To Do
  - In Progress
  - Done
- Task priority management
  - Low
  - Medium
  - High
- Project-specific task listing
- Task deletion
- Dashboard with project and task information
- Backend API validation
- Automated backend testing

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- HTML
- CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT Authentication

### Database
- SQLite

### Testing
- Pytest

### Development Tools
- Git
- GitHub
- Visual Studio Code

## Project Structure

```text
DevTrack/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── main.py
│   │   └── __init__.py
│   │
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_projects.py
│   │   └── test_tasks.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
