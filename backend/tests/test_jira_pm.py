import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def auth_headers():
    response = client.post(
        "/auth/login",
        json={"email": "admin@devtrack.edu", "password": "DevTrack@123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_jira_pm_templates(auth_headers):
    response = client.get("/pm/templates", headers=auth_headers)
    assert response.status_code == 200
    templates = response.json()
    assert len(templates) >= 5
    assert any("Software Development" in t["name"] for t in templates)


def test_jira_pm_workflows(auth_headers):
    response = client.get("/pm/workflows", headers=auth_headers)
    assert response.status_code == 200
    workflows = response.json()
    assert len(workflows) >= 1
    assert any(w["is_default"] for w in workflows)


def test_issue_creation_and_key_lookup(auth_headers):
    # 1. Fetch first project
    proj_resp = client.get("/projects/", headers=auth_headers)
    assert proj_resp.status_code == 200
    projects = proj_resp.json()
    assert len(projects) > 0
    project_id = projects[0]["id"]

    # 2. Create a new Story
    create_resp = client.post(
        f"/pm/projects/{project_id}/issues",
        json={
            "title": "Automated Test Jira Issue",
            "description": "Testing issue tracking with story points and automatic key generation",
            "issue_type": "story",
            "priority": "high",
            "story_points": 8,
            "labels": "qa,automated-test",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    issue = create_resp.json()
    assert "DEV-" in issue["issue_key"] or "PRJ-" in issue["issue_key"]
    issue_key = issue["issue_key"]

    # 3. Lookup directly by Issue Key
    lookup_resp = client.get(f"/pm/issues/{issue_key}", headers=auth_headers)
    assert lookup_resp.status_code == 200
    lookup_data = lookup_resp.json()
    assert lookup_data["title"] == "Automated Test Jira Issue"
    assert lookup_data["story_points"] == 8
    assert lookup_data["issue_type"] == "story"


def test_backlog_endpoint(auth_headers):
    proj_resp = client.get("/projects/", headers=auth_headers)
    project_id = proj_resp.json()[0]["id"]

    response = client.get(f"/pm/projects/{project_id}/backlog", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "product_backlog" in data
    assert "active_sprints" in data
    assert "epics" in data


def test_workload_and_capacity(auth_headers):
    proj_resp = client.get("/projects/", headers=auth_headers)
    project_id = proj_resp.json()[0]["id"]

    response = client.get(f"/pm/projects/{project_id}/workload", headers=auth_headers)
    assert response.status_code == 200
    workload = response.json()
    assert isinstance(workload, list)


def test_roadmap_timeline(auth_headers):
    proj_resp = client.get("/projects/", headers=auth_headers)
    project_id = proj_resp.json()[0]["id"]

    response = client.get(f"/pm/projects/{project_id}/roadmap", headers=auth_headers)
    assert response.status_code == 200
    roadmap = response.json()
    assert "epics" in roadmap
    assert "milestones" in roadmap


def test_circular_dependency_prevention(auth_headers):
    proj_resp = client.get("/projects/", headers=auth_headers)
    project_id = proj_resp.json()[0]["id"]

    # Create two tasks
    t1 = client.post(f"/pm/projects/{project_id}/issues", json={"title": "Dep Task 1"}, headers=auth_headers).json()["id"]
    t2 = client.post(f"/pm/projects/{project_id}/issues", json={"title": "Dep Task 2"}, headers=auth_headers).json()["id"]

    # t1 depends on t2
    dep1 = client.post(f"/pm/projects/{project_id}/dependencies?task_id={t1}&depends_on_id={t2}", headers=auth_headers)
    assert dep1.status_code == 200

    # t2 depends on t1 should fail with circular dependency error!
    dep2 = client.post(f"/pm/projects/{project_id}/dependencies?task_id={t2}&depends_on_id={t1}", headers=auth_headers)
    assert dep2.status_code == 400
    assert "Circular dependency" in dep2.json()["detail"]


def test_global_search(auth_headers):
    response = client.get("/pm/search?q=DEV", headers=auth_headers)
    assert response.status_code == 200
    results = response.json()
    assert "issues" in results
    assert "projects" in results
