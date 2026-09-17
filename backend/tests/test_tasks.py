from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db


SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def create_project():
    client.post(
        "/auth/register",
        json={
            "name": "Task Owner",
            "email": "task-owner@example.com",
            "password": "TestPassword123!",
        },
    )

    login_response = client.post(
        "/auth/login",
        json={
            "email": "task-owner@example.com",
            "password": "TestPassword123!",
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.post(
        "/projects/",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "name": "Task Project",
            "description": "Project for task testing",
        },
    )

    assert response.status_code == 200

    return response.json()["id"], token


def test_create_task():
    project_id, token = create_project()

    response = client.post(
        f"/projects/{project_id}/tasks",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "title": "Build authentication",
            "description": "Implement JWT authentication",
            "status": "todo",
            "priority": "high",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["title"] == "Build authentication"
    assert data["status"] == "todo"
    assert data["priority"] == "high"
    assert data["project_id"] == project_id


def test_get_project_tasks():
    project_id, token = create_project()

    create_response = client.post(
        f"/projects/{project_id}/tasks",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "title": "Test task",
            "description": "Testing task retrieval",
            "status": "in_progress",
            "priority": "medium",
        },
    )

    assert create_response.status_code == 200

    response = client.get(
        f"/projects/{project_id}/tasks",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200

    tasks = response.json()

    assert len(tasks) >= 1
    assert any(
        task["title"] == "Test task"
        for task in tasks
    )
