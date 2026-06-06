from flask import Blueprint, jsonify, request

from app.models.organization import Section
from app.utils.auth import role_required

sections_bp = Blueprint("sections", __name__, url_prefix="/api/sections")


@sections_bp.get("")
@sections_bp.get("/")
@role_required("admin")
def list_sections():
    department_id = request.args.get("department_id", type=int)
    query = Section.query.order_by(Section.name)

    if department_id:
        query = query.filter_by(department_id=department_id)

    return jsonify(
        {
            "sections": [
                {
                    "id": s.id,
                    "name": s.name,
                    "year": s.year,
                    "semester": s.semester,
                    "department_id": s.department_id,
                }
                for s in query.all()
            ]
        }
    )
