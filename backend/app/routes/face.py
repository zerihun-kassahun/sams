from flask import Blueprint, current_app, jsonify, request

from app.services.recognition_service import (
    clear_prepared_model,
    get_model_status,
    prepare_for_course,
)
from app.utils.auth import get_current_user, role_required

face_bp = Blueprint("face", __name__, url_prefix="/api/face")


@face_bp.get("/model-status")
@role_required("instructor")
def model_status():
    user = get_current_user()
    return jsonify(get_model_status(user.id))


@face_bp.post("/prepare")
@role_required("instructor")
def prepare_model():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    course_id = data.get("course_id")

    if not course_id:
        return jsonify({"error": "course_id is required."}), 400

    try:
        result = prepare_for_course(
            user.id,
            int(course_id),
            encodings_folder=current_app.config["ENCODINGS_FOLDER"],
            tolerance=current_app.config["FACE_TOLERANCE"],
        )
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result)


@face_bp.post("/clear")
@role_required("instructor")
def clear_model():
    user = get_current_user()
    clear_prepared_model(user.id)
    return jsonify({"message": "Prepared recognition model cleared.", "trained": False})
