# DevTrack Deployment Reference

## Local Deployment
1. Start PostgreSQL on port 5433 (or standard 5432).
2. Run database migrations: `alembic upgrade head`.
3. Launch FastAPI server: `uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend`.
4. Access DevTrack at `http://127.0.0.1:8000/devtrack.html`.

## Docker Deployment
Run `docker compose -f infrastructure/docker/docker-compose.yml up --build` to launch the PostgreSQL database container and FastAPI backend container simultaneously.
