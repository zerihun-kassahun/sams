from flask import Blueprint, jsonify, request

from app.models.attendance import AttendanceSession
from app.models.organization import Course, Department, Section
from app.services.report_service import (
    apply_session_date_filters,
    build_department_summary,
    build_instructor_course_summary,
    build_section_detail_report,
    build_session_report,
    parse_date_param,
)
from app.utils.auth import get_current_user, role_required

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.get("/instructor/sessions")
@role_required("instructor")
def instructor_sessions():
    user = get_current_user()
    course_id = request.args.get("course_id", type=int)
    from_date = parse_date_param(request.args.get("from"))
    to_date = parse_date_param(request.args.get("to"))

    query = AttendanceSession.query.filter_by(instructor_id=user.id)
    if course_id:
        course = Course.query.get(course_id)
        if not course or course.instructor_id != user.id:
            return jsonify({"error": "Course not found."}), 404
        query = query.filter_by(course_id=course_id)

    query = apply_session_date_filters(query, from_date, to_date)
    sessions = query.order_by(AttendanceSession.session_date.desc(), AttendanceSession.start_time.desc()).all()

    return jsonify(
        {
            "sessions": [
                {
                    "id": session.id,
                    "course_id": session.course_id,
                    "course_code": session.course.code,
                    "course_name": session.course.name,
                    "section_name": session.course.section.name if session.course.section else None,
                    "session_date": session.session_date.isoformat(),
                    "start_time": session.start_time.isoformat(),
                    "end_time": session.end_time.isoformat() if session.end_time else None,
                    "status": session.status,
                    "present_count": session.records.count(),
                }
                for session in sessions
            ]
        }
    )


@reports_bp.get("/instructor/sessions/<int:session_id>")
@role_required("instructor")
def instructor_session_report(session_id):
    user = get_current_user()
    session = AttendanceSession.query.get_or_404(session_id)

    if session.instructor_id != user.id:
        return jsonify({"error": "You do not have permission to view this report."}), 403

    return jsonify(build_session_report(session))


@reports_bp.get("/instructor/summary")
@role_required("instructor")
def instructor_course_summary():
    user = get_current_user()
    course_id = request.args.get("course_id", type=int)
    from_date = parse_date_param(request.args.get("from"))
    to_date = parse_date_param(request.args.get("to"))

    if not course_id:
        return jsonify({"error": "course_id is required."}), 400

    course = Course.query.get(course_id)
    if not course or course.instructor_id != user.id:
        return jsonify({"error": "Course not found."}), 404

    sessions_query = AttendanceSession.query.filter_by(
        course_id=course.id,
        instructor_id=user.id,
        status="closed",
    )
    sessions_query = apply_session_date_filters(sessions_query, from_date, to_date)
    sessions = sessions_query.order_by(AttendanceSession.session_date).all()

    return jsonify(build_instructor_course_summary(course, sessions))


@reports_bp.get("/department/summary")
@role_required("department_head")
def department_summary():
    user = get_current_user()
    if not user.department_id:
        return jsonify({"error": "Your account is not linked to a department."}), 400

    department = Department.query.get(user.department_id)
    if not department:
        return jsonify({"error": "Department not found."}), 404

    from_date = parse_date_param(request.args.get("from"))
    to_date = parse_date_param(request.args.get("to"))

    return jsonify(build_department_summary(department, from_date=from_date, to_date=to_date))


@reports_bp.get("/department/sections")
@role_required("department_head")
def department_sections():
    user = get_current_user()
    if not user.department_id:
        return jsonify({"error": "Your account is not linked to a department."}), 400

    sections = (
        Section.query.filter_by(department_id=user.department_id)
        .order_by(Section.name)
        .all()
    )

    return jsonify(
        {
            "sections": [
                {
                    "id": section.id,
                    "name": section.name,
                    "year": section.year,
                    "semester": section.semester,
                }
                for section in sections
            ]
        }
    )


@reports_bp.get("/department/sections/<int:section_id>")
@role_required("department_head")
def department_section_report(section_id):
    user = get_current_user()
    section = Section.query.get_or_404(section_id)

    if user.department_id != section.department_id:
        return jsonify({"error": "You do not have permission to view this section."}), 403

    from_date = parse_date_param(request.args.get("from"))
    to_date = parse_date_param(request.args.get("to"))

    return jsonify(
        build_section_detail_report(section, from_date=from_date, to_date=to_date)
    )
