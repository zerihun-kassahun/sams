import os
from pathlib import Path

import sqlalchemy as sa

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"

LOCAL_CORS_ORIGINS = [
    "http://127.0.0.1:5000",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]


def normalize_database_url(raw: str) -> str:
    """Neon and some hosts use postgres://; SQLAlchemy expects postgresql://."""
    if raw.startswith("postgres://"):
        return "postgresql://" + raw[len("postgres://") :]
    return raw


def resolve_database_uri() -> str:
    """SQLite locally; PostgreSQL (Neon) when DATABASE_URL is set."""
    raw = os.environ.get("DATABASE_URL")

    if not raw:
        db_path = INSTANCE_DIR / "sams.db"
    else:
        raw = normalize_database_url(raw)
        url = sa.engine.make_url(raw)
        if url.get_backend_name() == "sqlite" and url.database not in (None, "", ":memory:"):
            db_file = Path(url.database)
            if not db_file.is_absolute():
                db_path = INSTANCE_DIR / db_file.name
            else:
                db_path = db_file
        else:
            return raw

    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path.as_posix()}"


def resolve_cors_origins() -> list[str]:
    extra = os.environ.get("CORS_ORIGINS", "")
    origins = list(LOCAL_CORS_ORIGINS)
    for origin in extra.split(","):
        origin = origin.strip()
        if origin and origin not in origins:
            origins.append(origin)
    return origins


def is_production() -> bool:
    return os.environ.get("FLASK_ENV", "development").lower() == "production"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
    SQLALCHEMY_DATABASE_URI = resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", str(BASE_DIR / "uploads" / "faces"))
    ENCODINGS_FOLDER = str(BASE_DIR / "encodings")
    FACE_TOLERANCE = float(os.environ.get("FACE_TOLERANCE", "0.6"))
    CORS_ORIGINS = resolve_cors_origins()
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = is_production()
