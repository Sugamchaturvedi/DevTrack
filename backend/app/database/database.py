import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

db_url = settings.database_url

# Standardize postgres protocol
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# In AWS Lambda / Vercel Serverless, direct Supabase endpoints (db.*.supabase.co) resolve
# only to IPv6 which serverless cannot route. Route to Supabase's IPv4 shared pooler instead:
if "db.rdawwkebctctlhbigzfo.supabase.co" in db_url:
    db_url = db_url.replace(
        "db.rdawwkebctctlhbigzfo.supabase.co",
        "aws-1-ap-south-1.pooler.supabase.com"
    )
    if "devtrack_app" in db_url and "devtrack_app.rdawwkebctctlhbigzfo" not in db_url:
        db_url = db_url.replace("devtrack_app", "devtrack_app.rdawwkebctctlhbigzfo", 1)

if "supabase" in db_url and "sslmode" not in db_url:
    separator = "&" if "?" in db_url else "?"
    db_url = f"{db_url}{separator}sslmode=require"

is_sqlite = "sqlite" in db_url

if is_sqlite:
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    # Graceful fallback between psycopg (v3) and psycopg2
    if "postgresql+psycopg://" in db_url:
        try:
            import psycopg  # noqa: F401
        except ImportError:
            try:
                import psycopg2  # noqa: F401
                db_url = db_url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
            except ImportError:
                pass
    elif "postgresql+psycopg2://" in db_url:
        try:
            import psycopg2  # noqa: F401
        except ImportError:
            try:
                import psycopg  # noqa: F401
                db_url = db_url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
            except ImportError:
                pass

    is_serverless = bool(
        os.getenv("VERCEL")
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or os.getenv("LAMBDA_TASK_ROOT")
    )

    if is_serverless:
        engine = create_engine(
            db_url,
            pool_size=5,
            max_overflow=2,
            pool_recycle=300,
            pool_pre_ping=True,
        )
    else:
        engine = create_engine(
            db_url,
            pool_size=20,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800,
            pool_pre_ping=True,
        )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_health() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
