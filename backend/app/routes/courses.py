from flask import Blueprint, jsonify

from app.models.organization import Course
from app.utils.auth import get_current_user, role_required

courses_bp = Blueprint("courses", __name__, url_prefix="/api/courses")


@courses_bp.get("")
@courses_bp.get("/")
@role_required("instructor")
def list_courses():
    user = get_current_user()
    courses = Course.query.filter_by(instructor_id=user.id).order_by(Course.code).all()

    return jsonify(
        {
            "courses": [
                {
                    "id": course.id,
                    "code": course.code,
                    "name": course.name,
                    "schedule_info": course.schedule_info,
                    "section_id": course.section_id,
                    "section_name": course.section.name if course.section else None,
                    "department_name": (
                        course.section.department.name
                        if course.section and course.section.department
                        else None
                    ),
                }
                for course in courses
            ]
        }
    )
