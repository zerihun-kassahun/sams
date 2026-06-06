import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, send_from_directory
from flask_cors import CORS

from app.config import Config
from app.extensions import db
from app.routes.admin import admin_bp
from app.routes.attendance import attendance_bp
from app.routes.auth import auth_bp
from app.routes.courses import courses_bp
from app.routes.departments import departments_bp
from app.routes.face import face_bp
from app.routes.reports import reports_bp
from app.routes.sections import sections_bp
from app.routes.students import students_bp
from app.routes.users import users_bp

load_dotenv()

FRONTEND_ROOT = Path(__file__).resolve().parent.parent.parent / "frontend"
FRONTEND_DIST = FRONTEND_ROOT / "dist"


def create_app(config_class=Config):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["ENCODINGS_FOLDER"], exist_ok=True)

    CORS(
        app,
        supports_credentials=True,
        origins=app.config["CORS_ORIGINS"],
    )

    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(departments_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(sections_bp)
    app.register_blueprint(students_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(face_bp)

    if FRONTEND_DIST.is_dir() and (FRONTEND_DIST / "index.html").is_file():

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_react(path):
            if path.startswith("api/"):
                return {"error": "Not found."}, 404

            file_path = FRONTEND_DIST / path
            if path and file_path.is_file():
                return send_from_directory(FRONTEND_DIST, path)
            return send_from_directory(FRONTEND_DIST, "index.html")

    else:

        @app.get("/")
        def api_only_root():
            return {
                "message": "SAMS API is running.",
                "frontend": "Run `npm run dev` in the frontend folder (development) or `npm run build` for production.",
            }

    with app.app_context():
        db.create_all()

    return app
