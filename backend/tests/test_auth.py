import asyncio
import httpx
from app.main import app


def test_register_user():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            email = f"user_{asyncio.get_event_loop().time()}@example.com"
            response = await client.post(
                "/auth/register",
                json={
                    "name": "Auth Test User",
                    "email": email,
                    "password": "TestPassword123!",
                    "role": "student"
                },
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "Auth Test User"
            assert data["email"] == email
            assert "password_hash" not in data

    asyncio.run(run())


def test_register_duplicate_user():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            email = f"dup_{asyncio.get_event_loop().time()}@example.com"
            user = {
                "name": "Duplicate User",
                "email": email,
                "password": "TestPassword123!",
            }
            first = await client.post("/auth/register", json=user)
            assert first.status_code == 201

            second = await client.post("/auth/register", json=user)
            assert second.status_code == 400
            assert second.json()["detail"] == "Email already registered"

    asyncio.run(run())


def test_login_user():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            email = f"login_{asyncio.get_event_loop().time()}@example.com"
            await client.post(
                "/auth/register",
                json={
                    "name": "Login User",
                    "email": email,
                    "password": "TestPassword123!",
                },
            )
            response = await client.post(
                "/auth/login",
                json={
                    "email": email,
                    "password": "TestPassword123!",
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"

    asyncio.run(run())


def test_login_invalid_password():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            email = f"invalid_{asyncio.get_event_loop().time()}@example.com"
            await client.post(
                "/auth/register",
                json={
                    "name": "Invalid User",
                    "email": email,
                    "password": "TestPassword123!",
                },
            )
            response = await client.post(
                "/auth/login",
                json={
                    "email": email,
                    "password": "WrongPassword123!",
                },
            )
            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid email or password"

    asyncio.run(run())
