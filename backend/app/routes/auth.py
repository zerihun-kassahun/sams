from flask import Blueprint, jsonify, request, session

from app.extensions import db
from app.models.user import User
from app.utils.auth import get_current_user, login_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.is_active or not user.check_password(password):
        return jsonify({"error": "Invalid username or password."}), 401

    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    return jsonify({"message": "Login successful.", "user": user.to_dict()})


@auth_bp.post("/logout")
@login_required
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."})


@auth_bp.get("/me")
@login_required
def me():
    user = get_current_user()
    return jsonify({"user": user.to_dict()})
