from flask import Blueprint, jsonify

from app.models.organization import Department
from app.utils.auth import role_required

departments_bp = Blueprint("departments", __name__, url_prefix="/api/departments")


@departments_bp.get("")
@departments_bp.get("/")
@role_required("admin")
def list_departments():
    departments = Department.query.order_by(Department.name).all()
    return jsonify(
        {
            "departments": [
                {"id": d.id, "name": d.name, "code": d.code}
                for d in departments
            ]
        }
    )
