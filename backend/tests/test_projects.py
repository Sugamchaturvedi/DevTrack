import asyncio
import httpx
from app.main import app


async def get_auth_token(client):
    email = f"proj_user_{asyncio.get_event_loop().time()}@example.com"
    await client.post(
        "/auth/register",
        json={
            "name": "Project User",
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
    return login_res.json()["access_token"]


def test_create_project():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            token = await get_auth_token(client)
            headers = {"Authorization": f"Bearer {token}"}

            response = await client.post(
                "/projects/",
                json={
                    "name": "DevTrack Test Project",
                    "description": "Testing project creation API",
                    "category": "Capstone",
                    "priority": "high",
                },
                headers=headers,
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "DevTrack Test Project"
            assert data["category"] == "Capstone"

    asyncio.run(run())


def test_list_projects():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            token = await get_auth_token(client)
            headers = {"Authorization": f"Bearer {token}"}

            await client.post(
                "/projects/",
                json={
                    "name": "Listed Project",
                    "description": "Description",
                },
                headers=headers,
            )

            response = await client.get("/projects/", headers=headers)
            assert response.status_code == 200
            assert isinstance(response.json(), list)

    asyncio.run(run())


def test_get_project_by_id():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            token = await get_auth_token(client)
            headers = {"Authorization": f"Bearer {token}"}

            created = await client.post(
                "/projects/",
                json={
                    "name": "Specific Project",
                    "description": "Specific Description",
                },
                headers=headers,
            )
            proj_id = created.json()["id"]

            response = await client.get(f"/projects/{proj_id}", headers=headers)
            assert response.status_code == 200
            assert response.json()["id"] == proj_id

    asyncio.run(run())
