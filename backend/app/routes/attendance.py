from datetime import date, datetime

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.organization import Course
from app.services.face_service import FACE_LIBS_AVAILABLE, FaceCaptureError, decode_image_data, extract_face_encoding
from app.services.recognition_service import get_prepared_model, match_face_encoding
from app.utils.auth import get_current_user, role_required

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")


def _record_response(record: AttendanceRecord) -> dict:
    return {
        "id": record.id,
        "student_db_id": record.student_id,
        "student_id": record.student.student_id,
        "full_name": record.student.full_name,
        "status": record.status,
        "recognized_at": record.recognized_at.isoformat(),
        "confidence_score": record.confidence_score,
    }


def _session_response(session: AttendanceSession, *, include_records: bool = True) -> dict:
    data = {
        "id": session.id,
        "course_id": session.course_id,
        "course_code": session.course.code if session.course else None,
        "course_name": session.course.name if session.course else None,
        "section_name": session.course.section.name if session.course and session.course.section else None,
        "session_date": session.session_date.isoformat(),
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat() if session.end_time else None,
        "status": session.status,
        "present_count": session.records.count(),
    }
    if include_records:
        records = session.records.order_by(AttendanceRecord.recognized_at.desc()).all()
        data["records"] = [_record_response(record) for record in records]
    return data


def _get_active_session(instructor_id: int) -> AttendanceSession | None:
    return AttendanceSession.query.filter_by(instructor_id=instructor_id, status="active").first()


@attendance_bp.get("/sessions")
@role_required("instructor")
def list_sessions():
    user = get_current_user()
    sessions = (
        AttendanceSession.query.filter_by(instructor_id=user.id)
        .order_by(AttendanceSession.start_time.desc())
        .limit(20)
        .all()
    )
    return jsonify({"sessions": [_session_response(session, include_records=False) for session in sessions]})


@attendance_bp.get("/sessions/active")
@role_required("instructor")
def get_active_session():
    user = get_current_user()
    session = _get_active_session(user.id)
    if not session:
        return jsonify({"session": None})
    return jsonify({"session": _session_response(session)})


@attendance_bp.post("/sessions")
@role_required("instructor")
def start_session():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    course_id = data.get("course_id")

    model = get_prepared_model(user.id)
    if not model:
        return jsonify(
            {"error": "Face recognition is not prepared. Prepare recognition for a course first."}
        ), 400

    if course_id and int(course_id) != model.course_id:
        return jsonify(
            {
                "error": "Prepared recognition does not match the selected course. "
                "Prepare recognition for this course first."
            }
        ), 400

    active = _get_active_session(user.id)
    if active:
        if active.course_id == model.course_id:
            return jsonify(
                {
                    "message": "Resumed active attendance session.",
                    "session": _session_response(active),
                }
            )
        return jsonify(
            {
                "error": "Another attendance session is already active. Close it before starting a new one."
            }
        ), 400

    course = Course.query.get(model.course_id)
    if not course or course.instructor_id != user.id:
        return jsonify({"error": "You are not assigned to this course."}), 403

    session = AttendanceSession(
        course_id=model.course_id,
        instructor_id=user.id,
        session_date=date.today(),
        status="active",
    )
    db.session.add(session)
    db.session.commit()

    return jsonify(
        {
            "message": "Attendance session started.",
            "session": _session_response(session),
        }
    ), 201


@attendance_bp.post("/sessions/<int:session_id>/recognize")
@role_required("instructor")
def recognize_attendance(session_id):
    user = get_current_user()
    session = AttendanceSession.query.get_or_404(session_id)

    if session.instructor_id != user.id:
        return jsonify({"error": "You do not have permission for this session."}), 403
    if session.status != "active":
        return jsonify({"error": "This attendance session is closed."}), 400

    model = get_prepared_model(user.id)
    if not model or model.course_id != session.course_id:
        return jsonify(
            {"error": "Face recognition is not prepared for this course. Prepare recognition again."}
        ), 400

    if not FACE_LIBS_AVAILABLE:
        return jsonify(
            {"error": "Live recognition requires face_recognition. Install requirements-face.txt."}
        ), 400

    data = request.get_json(silent=True) or {}
    image_data = data.get("image_data")
    if not image_data:
        return jsonify({"error": "Image data is required."}), 400

    try:
        image_bytes = decode_image_data(image_data)
        encoding = extract_face_encoding(image_bytes)
    except FaceCaptureError as exc:
        return jsonify({"recognized": False, "error": str(exc)}), 400

    if encoding is None:
        return jsonify(
            {"recognized": False, "error": "Could not extract facial features from the image."}
        ), 400

    try:
        match, distance = match_face_encoding(model, encoding)
    except ValueError as exc:
        return jsonify({"recognized": False, "error": str(exc)}), 400

    if not match:
        return jsonify(
            {
                "recognized": False,
                "message": "Face not recognized. Student may not be registered for this section.",
                "distance": round(distance, 4),
            }
        )

    existing = AttendanceRecord.query.filter_by(
        session_id=session.id, student_id=match["student_db_id"]
    ).first()
    student_info = {
        "student_db_id": match["student_db_id"],
        "student_id": match["student_id"],
        "full_name": match["full_name"],
    }

    if existing:
        return jsonify(
            {
                "recognized": True,
                "already_marked": True,
                "message": f"{match['full_name']} is already marked present.",
                "student": student_info,
                "record": _record_response(existing),
                "confidence_score": existing.confidence_score,
            }
        )

    confidence = round(max(0.0, 1.0 - distance), 4)
    record = AttendanceRecord(
        session_id=session.id,
        student_id=match["student_db_id"],
        status="present",
        confidence_score=confidence,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify(
        {
            "recognized": True,
            "already_marked": False,
            "message": f"Attendance recorded for {match['full_name']}.",
            "student": student_info,
            "record": _record_response(record),
            "confidence_score": confidence,
            "distance": round(distance, 4),
        }
    )


@attendance_bp.post("/sessions/<int:session_id>/close")
@role_required("instructor")
def close_session(session_id):
    user = get_current_user()
    session = AttendanceSession.query.get_or_404(session_id)

    if session.instructor_id != user.id:
        return jsonify({"error": "You do not have permission for this session."}), 403
    if session.status == "closed":
        return jsonify({"message": "Session already closed.", "session": _session_response(session)})

    session.status = "closed"
    session.end_time = datetime.utcnow()
    db.session.commit()

    return jsonify(
        {
            "message": "Attendance session closed.",
            "session": _session_response(session),
        }
    )
