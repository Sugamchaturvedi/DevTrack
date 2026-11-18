import asyncio
import httpx
from app.main import app


async def setup_project_and_auth(client):
    email = f"task_owner_{asyncio.get_event_loop().time()}@example.com"
    await client.post(
        "/auth/register",
        json={
            "name": "Task Test Owner",
            "email": email,
            "password": "TestPassword123!",
            "role": "faculty",
        },
    )
    login_res = await client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "TestPassword123!",
        },
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = await client.post(
        "/projects/",
        json={
            "name": "Task Test Project",
            "description": "Project for task tests",
        },
        headers=headers,
    )
    return headers, proj_res.json()["id"]


def test_create_task():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            headers, proj_id = await setup_project_and_auth(client)

            response = await client.post(
                f"/projects/{proj_id}/tasks",
                json={
                    "title": "Design Database Schema",
                    "description": "Create Postgres models",
                    "status": "todo",
                    "priority": "high",
                    "estimated_hours": 5.0,
                },
                headers=headers,
            )
            assert response.status_code == 201
            data = response.json()
            assert data["title"] == "Design Database Schema"
            assert data["priority"] == "high"

    asyncio.run(run())


def test_list_tasks():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            headers, proj_id = await setup_project_and_auth(client)

            await client.post(
                f"/projects/{proj_id}/tasks",
                json={
                    "title": "Build API Endpoints",
                    "status": "in_progress",
                    "priority": "urgent",
                },
                headers=headers,
            )

            response = await client.get(f"/projects/{proj_id}/tasks", headers=headers)
            assert response.status_code == 200
            assert len(response.json()) >= 1

    asyncio.run(run())


def test_kanban_board():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            headers, proj_id = await setup_project_and_auth(client)

            task_res = await client.post(
                f"/projects/{proj_id}/tasks",
                json={
                    "title": "Kanban Test Task",
                    "status": "todo",
                    "priority": "medium",
                },
                headers=headers,
            )
            task_id = task_res.json()["id"]

            # Fetch kanban board
            kb_res = await client.get(f"/projects/{proj_id}/tasks/kanban", headers=headers)
            assert kb_res.status_code == 200
            lanes = kb_res.json()["lanes"]
            assert len(lanes) >= 6

            # Move task to completed
            put_res = await client.put(
                f"/projects/{proj_id}/tasks/{task_id}",
                json={"status": "completed"},
                headers=headers,
            )
            assert put_res.status_code == 200
            assert put_res.json()["status"] == "completed"

    asyncio.run(run())
