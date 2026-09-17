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


def create_test_user():
    register_response = client.post(
        "/auth/register",
        json={
            "name": "Project User",
            "email": "project-user@example.com",
            "password": "TestPassword123!",
        },
    )

    if register_response.status_code == 400:
        login_response = client.post(
            "/auth/login",
            json={
                "email": "project-user@example.com",
                "password": "TestPassword123!",
            },
        )

        return login_response.json()["access_token"]

    assert register_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={
            "email": "project-user@example.com",
            "password": "TestPassword123!",
        },
    )

    assert login_response.status_code == 200

    return login_response.json()["access_token"]


def test_create_project():
    token = create_test_user()

    response = client.post(
        "/projects/",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "name": "DevTrack Project",
            "description": "Project management application",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "DevTrack Project"
    assert data["description"] == "Project management application"


def test_get_projects():
    token = create_test_user()

    create_response = client.post(
        "/projects/",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "name": "Test Project",
            "description": "Testing project",
        },
    )

    assert create_response.status_code == 200

    response = client.get(
        "/projects/",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200

    projects = response.json()

    assert len(projects) >= 1
    assert any(
        project["name"] == "Test Project"
        for project in projects
    )
