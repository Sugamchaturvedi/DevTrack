import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.core.config import settings
from app.database.database import Base, engine
import app.database.models

from app.routes import (
    agile,
    analytics,
    auth,
    collaboration,
    jira_pm,
    projects,
    submissions,
    tasks,
    university,
    users,
)

# Ensure database tables exist
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database init warning (non-fatal in serverless): {e}")

app = FastAPI(
    title=settings.app_name,
    description="Enterprise University Project Management System",
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Functional Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(university.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(agile.router)
app.include_router(jira_pm.router)
app.include_router(submissions.router)
app.include_router(collaboration.router)
app.include_router(analytics.router)


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "database": "postgresql",
    }


@app.get("/api")
def api_root():
    return {
        "message": "DevTrack University Project Management System API",
        "version": settings.app_version,
        "docs_url": "/docs",
    }
