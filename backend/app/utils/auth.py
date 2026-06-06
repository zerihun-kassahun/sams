from functools import wraps

from flask import jsonify, session

from app.models.user import User


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return User.query.get(user_id)


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user or not user.is_active:
            return jsonify({"error": "Authentication required."}), 401
        return f(*args, **kwargs)

    return decorated


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user or not user.is_active:
                return jsonify({"error": "Authentication required."}), 401
            if user.role not in roles:
                return jsonify({"error": "You do not have permission for this action."}), 403
            return f(*args, **kwargs)

        return decorated

    return decorator
