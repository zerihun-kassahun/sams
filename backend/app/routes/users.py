from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models.organization import Course, Department, Section
from app.models.student import Student
from app.models.user import User
from app.utils.auth import get_current_user, role_required

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

MANAGEABLE_ROLES = {"instructor", "department_head"}


def _validate_user_payload(data, *, creating=False, user=None):
    errors = []

    username = (data.get("username") or "").strip()
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip() or None
    role = (data.get("role") or "").strip() or (user.role if user else "")
    password = data.get("password") or ""
    department_id = data.get("department_id")

    if creating:
        if not username:
            errors.append("Username is required.")
        elif User.query.filter_by(username=username).first():
            errors.append("Username already exists.")
        if not full_name:
            errors.append("Full name is required.")
        if not password:
            errors.append("Password is required.")
        elif len(password) < 6:
            errors.append("Password must be at least 6 characters.")
        if role not in MANAGEABLE_ROLES:
            errors.append("Role must be instructor or department_head.")
    else:
        if username and user and username != user.username:
            if User.query.filter_by(username=username).first():
                errors.append("Username already exists.")
        if data.get("role") and data["role"] not in MANAGEABLE_ROLES:
            errors.append("Role must be instructor or department_head.")
        if password and len(password) < 6:
            errors.append("Password must be at least 6 characters.")

    effective_role = role if creating or data.get("role") else user.role
    dept_id = department_id if department_id not in (None, "") else (user.department_id if user else None)

    if effective_role == "department_head":
        if dept_id is None:
            errors.append("Department is required for department heads.")
        elif not Department.query.get(int(dept_id)):
            errors.append("Selected department does not exist.")

    if errors:
        return None, errors

    return {
        "username": username or (user.username if user else None),
        "full_name": full_name or (user.full_name if user else None),
        "email": email if "email" in data or creating else user.email,
        "role": effective_role,
        "password": password,
        "department_id": int(dept_id) if dept_id is not None else None,
        "is_active": data.get("is_active") if "is_active" in data else (user.is_active if user else True),
    }, []


def _user_response(user):
    data = user.to_dict()
    if user.department:
        data["department_name"] = user.department.name
    return data


@users_bp.get("/")
@role_required("admin")
def list_users():
    role = request.args.get("role")
    query = User.query.filter(User.role.in_(MANAGEABLE_ROLES)).order_by(User.created_at.desc())

    if role in MANAGEABLE_ROLES:
        query = query.filter_by(role=role)

    return jsonify({"users": [_user_response(u) for u in query.all()]})


@users_bp.get("/stats")
@role_required("admin")
def user_stats():
    return jsonify(
        {
            "students": Student.query.count(),
            "instructors": User.query.filter_by(role="instructor", is_active=True).count(),
            "department_heads": User.query.filter_by(role="department_head", is_active=True).count(),
            "sections": Section.query.count(),
        }
    )


@users_bp.post("/")
@role_required("admin")
def create_user():
    data = request.get_json(silent=True) or {}
    payload, errors = _validate_user_payload(data, creating=True)
    if errors:
        return jsonify({"error": errors[0], "errors": errors}), 400

    user = User(
        username=payload["username"],
        role=payload["role"],
        full_name=payload["full_name"],
        email=payload["email"],
        department_id=payload["department_id"] if payload["role"] == "department_head" else None,
    )
    user.set_password(payload["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created successfully.", "user": _user_response(user)}), 201


@users_bp.get("/<int:user_id>")
@role_required("admin")
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.role not in MANAGEABLE_ROLES:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": _user_response(user)})


@users_bp.put("/<int:user_id>")
@role_required("admin")
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.role not in MANAGEABLE_ROLES:
        return jsonify({"error": "This account cannot be modified here."}), 403

    data = request.get_json(silent=True) or {}
    payload, errors = _validate_user_payload(data, creating=False, user=user)
    if errors:
        return jsonify({"error": errors[0], "errors": errors}), 400

    if payload.get("username"):
        user.username = payload["username"]
    if data.get("full_name") is not None:
        user.full_name = payload["full_name"]
    if "email" in data:
        user.email = payload["email"]
    if data.get("role"):
        user.role = payload["role"]

    if user.role == "department_head":
        user.department_id = payload["department_id"]
    else:
        user.department_id = None

    if payload.get("password"):
        user.set_password(payload["password"])

    if "is_active" in data:
        current = get_current_user()
        if user.id == current.id and not data["is_active"]:
            return jsonify({"error": "You cannot deactivate your own account."}), 400
        user.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify({"message": "User updated successfully.", "user": _user_response(user)})


@users_bp.delete("/<int:user_id>")
@role_required("admin")
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    current = get_current_user()

    if user.id == current.id:
        return jsonify({"error": "You cannot delete your own account."}), 400

    if user.role not in MANAGEABLE_ROLES:
        return jsonify({"error": "This account cannot be deleted here."}), 403

    if user.role == "instructor" and Course.query.filter_by(instructor_id=user.id).first():
        return jsonify(
            {
                "error": "Cannot delete instructor assigned to courses. Reassign courses first or deactivate the account."
            }
        ), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User removed successfully."})
