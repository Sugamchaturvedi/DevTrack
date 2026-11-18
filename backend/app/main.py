import os
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.database import Base, engine
import app.database.models  # Register all models with Base

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
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="Enterprise University Project Management System — Scalable academic and agile project platform",
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

# Mount Uploads directory
upload_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", settings.upload_dir))
os.makedirs(upload_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_path), name="uploads")

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


frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))

# Dedicated entry routes for DevTrack Single Page Application
@app.get("/", include_in_schema=False)
def serve_root():
    devtrack_file = os.path.join(frontend_path, "devtrack.html")
    if os.path.exists(devtrack_file):
        return FileResponse(devtrack_file)
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "DevTrack Frontend"}

@app.get("/devtrack.html", include_in_schema=False)
def serve_devtrack_html():
    devtrack_file = os.path.join(frontend_path, "devtrack.html")
    if os.path.exists(devtrack_file):
        return FileResponse(devtrack_file)
    return {"detail": "devtrack.html not found"}

@app.get("/index.html", include_in_schema=False)
def serve_index_html():
    devtrack_file = os.path.join(frontend_path, "devtrack.html")
    if os.path.exists(devtrack_file):
        return FileResponse(devtrack_file)
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"detail": "index.html not found"}

# Frontend static app mounting (Must be mounted last to allow API routes precedence)
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
