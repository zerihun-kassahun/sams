import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, current_app, jsonify, send_file

from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.organization import Course, Department, Section
from app.models.student import Student, StudentFace
from app.models.user import User
from app.utils.auth import role_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

BACKUP_PATTERN = re.compile(r"^sams_backup_\d{8}_\d{6}\.db$")


def _sqlite_paths():
    db_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
    if not db_uri.startswith("sqlite:///"):
        return None, None, None

    db_path = Path(db_uri.replace("sqlite:///", ""))
    backup_dir = db_path.parent / "backups"
    return db_uri, db_path, backup_dir


def _backup_entry(path: Path) -> dict:
    stat = path.stat()
    return {
        "filename": path.name,
        "size_bytes": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
    }


@admin_bp.get("/health")
@role_required("admin")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@admin_bp.get("/database")
@role_required("admin")
def database_info():
    db_uri, db_path, backup_dir = _sqlite_paths()
    if not db_path:
        return jsonify({"error": "Database info is only available for SQLite deployments."}), 501

    backup_dir.mkdir(exist_ok=True)
    backups = sorted(
        backup_dir.glob("sams_backup_*.db"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )

    return jsonify(
        {
            "database": {
                "engine": "sqlite",
                "path": str(db_path),
                "exists": db_path.exists(),
                "size_bytes": db_path.stat().st_size if db_path.exists() else 0,
                "backup_directory": str(backup_dir),
            },
            "counts": {
                "users": User.query.count(),
                "students": Student.query.count(),
                "student_faces": StudentFace.query.count(),
                "departments": Department.query.count(),
                "sections": Section.query.count(),
                "courses": Course.query.count(),
                "attendance_sessions": AttendanceSession.query.count(),
                "attendance_records": AttendanceRecord.query.count(),
            },
            "backups": [_backup_entry(path) for path in backups],
        }
    )


@admin_bp.post("/backup")
@role_required("admin")
def backup_database():
    _, db_path, backup_dir = _sqlite_paths()
    if not db_path:
        return jsonify({"error": "Backup is only configured for SQLite in this version."}), 501

    if not db_path.exists():
        return jsonify({"error": "Database file not found."}), 404

    backup_dir.mkdir(exist_ok=True)
    backup_name = f"sams_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.db"
    backup_path = backup_dir / backup_name
    shutil.copy2(db_path, backup_path)

    return jsonify(
        {
            "message": "Backup created successfully.",
            "backup": _backup_entry(backup_path),
        }
    )


@admin_bp.get("/backups/<filename>")
@role_required("admin")
def download_backup(filename):
    if not BACKUP_PATTERN.match(filename):
        return jsonify({"error": "Invalid backup filename."}), 400

    _, _, backup_dir = _sqlite_paths()
    if not backup_dir:
        return jsonify({"error": "Backup download is only available for SQLite."}), 501

    backup_path = backup_dir / filename
    if not backup_path.is_file():
        return jsonify({"error": "Backup file not found."}), 404

    return send_file(backup_path, as_attachment=True, download_name=filename)


@admin_bp.delete("/backups/<filename>")
@role_required("admin")
def delete_backup(filename):
    if not BACKUP_PATTERN.match(filename):
        return jsonify({"error": "Invalid backup filename."}), 400

    _, _, backup_dir = _sqlite_paths()
    if not backup_dir:
        return jsonify({"error": "Backup management is only available for SQLite."}), 501

    backup_path = backup_dir / filename
    if not backup_path.is_file():
        return jsonify({"error": "Backup file not found."}), 404

    try:
        backup_path.unlink()
    except OSError as exc:
        return jsonify({"error": f"Could not delete backup: {exc}"}), 500

    return jsonify({"message": "Backup deleted successfully."})
