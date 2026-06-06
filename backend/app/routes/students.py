import json
import shutil
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from app.extensions import db
from app.models.organization import Department, Section
from app.models.student import Student, StudentFace
from app.services.face_service import FaceCaptureError, decode_image_data, save_student_face
from app.utils.auth import role_required

students_bp = Blueprint("students", __name__, url_prefix="/api/students")


def _student_response(student: Student) -> dict:
    data = student.to_dict()
    if student.department:
        data["department_name"] = student.department.name
    if student.section:
        data["section_name"] = student.section.name
    return data


def _validate_student_payload(data, *, creating=False, student=None):
    errors = []

    student_id = (data.get("student_id") or "").strip()
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip() or None
    department_id = data.get("department_id")
    section_id = data.get("section_id")
    consent_given = bool(data.get("consent_given"))

    if creating:
        if not student_id:
            errors.append("Student ID is required.")
        elif Student.query.filter_by(student_id=student_id).first():
            errors.append("Student ID already exists.")
        if not full_name:
            errors.append("Full name is required.")
        if not consent_given:
            errors.append("Biometric consent is required to register facial data.")
    else:
        if student_id and student and student_id != student.student_id:
            if Student.query.filter_by(student_id=student_id).first():
                errors.append("Student ID already exists.")

    dept_id = department_id if department_id not in (None, "") else (student.department_id if student else None)
    sec_id = section_id if section_id not in (None, "") else (student.section_id if student else None)

    if dept_id is None:
        errors.append("Department is required.")
    elif not Department.query.get(int(dept_id)):
        errors.append("Selected department does not exist.")

    if sec_id is None:
        errors.append("Section is required.")
    else:
        section = Section.query.get(int(sec_id))
        if not section:
            errors.append("Selected section does not exist.")
        elif dept_id and section.department_id != int(dept_id):
            errors.append("Section does not belong to the selected department.")

    if errors:
        return None, errors

    return {
        "student_id": student_id or (student.student_id if student else None),
        "full_name": full_name or (student.full_name if student else None),
        "email": email if "email" in data or creating else student.email,
        "department_id": int(dept_id),
        "section_id": int(sec_id),
        "consent_given": consent_given if creating or "consent_given" in data else student.consent_given,
        "is_active": data.get("is_active") if "is_active" in data else (student.is_active if student else True),
    }, []


def _store_face_capture(student: Student, image_data: str):
    image_bytes = decode_image_data(image_data)
    file_path, encoding = save_student_face(
        student, image_bytes, current_app.config["UPLOAD_FOLDER"]
    )

    face = StudentFace(
        student_id=student.id,
        image_path=str(file_path),
        encoding_json=json_dumps_encoding(encoding),
        is_primary=student.faces.count() == 0,
    )
    db.session.add(face)
    return face, encoding


def json_dumps_encoding(encoding):
    return json.dumps(encoding) if encoding is not None else None


@students_bp.get("")
@students_bp.get("/")
@role_required("admin")
def list_students():
    department_id = request.args.get("department_id", type=int)
    section_id = request.args.get("section_id", type=int)

    query = Student.query.order_by(Student.created_at.desc())
    if department_id:
        query = query.filter_by(department_id=department_id)
    if section_id:
        query = query.filter_by(section_id=section_id)

    return jsonify({"students": [_student_response(s) for s in query.all()]})


@students_bp.post("")
@students_bp.post("/")
@role_required("admin")
def create_student():
    data = request.get_json(silent=True) or {}
    payload, errors = _validate_student_payload(data, creating=True)
    if errors:
        return jsonify({"error": errors[0], "errors": errors}), 400

    student = Student(
        student_id=payload["student_id"],
        full_name=payload["full_name"],
        email=payload["email"],
        department_id=payload["department_id"],
        section_id=payload["section_id"],
        consent_given=payload["consent_given"],
    )
    db.session.add(student)
    db.session.flush()

    face_images = data.get("face_images") or []
    if not face_images:
        db.session.rollback()
        return jsonify({"error": "At least one facial image is required."}), 400

    warnings = []
    try:
        for image_data in face_images:
            face, encoding = _store_face_capture(student, image_data)
            if encoding is None:
                warnings.append(
                    "Face image saved without encoding. Install face_recognition for full recognition support."
                )
    except FaceCaptureError as exc:
        db.session.rollback()
        _cleanup_student_files(student.student_id)
        return jsonify({"error": str(exc)}), 400

    db.session.commit()

    response = {
        "message": "Student registered successfully.",
        "student": _student_response(student),
    }
    if warnings:
        response["warnings"] = list(dict.fromkeys(warnings))
    return jsonify(response), 201


@students_bp.get("/<int:student_id>")
@role_required("admin")
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    return jsonify({"student": _student_response(student)})


@students_bp.put("/<int:student_id>")
@role_required("admin")
def update_student(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.get_json(silent=True) or {}
    payload, errors = _validate_student_payload(data, creating=False, student=student)
    if errors:
        return jsonify({"error": errors[0], "errors": errors}), 400

    if data.get("student_id"):
        student.student_id = payload["student_id"]
    if data.get("full_name") is not None:
        student.full_name = payload["full_name"]
    if "email" in data:
        student.email = payload["email"]
    if data.get("department_id"):
        student.department_id = payload["department_id"]
    if data.get("section_id"):
        student.section_id = payload["section_id"]
    if "consent_given" in data:
        student.consent_given = payload["consent_given"]
    if "is_active" in data:
        student.is_active = bool(payload["is_active"])

    db.session.commit()
    return jsonify({"message": "Student updated successfully.", "student": _student_response(student)})


@students_bp.post("/<int:student_id>/capture-face")
@role_required("admin")
def capture_face(student_id):
    student = Student.query.get_or_404(student_id)
    if not student.consent_given:
        return jsonify({"error": "Student has not given biometric consent."}), 400

    data = request.get_json(silent=True) or {}
    image_data = data.get("image_data")
    if not image_data:
        return jsonify({"error": "Image data is required."}), 400

    try:
        face, encoding = _store_face_capture(student, image_data)
        db.session.commit()
    except FaceCaptureError as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400

    response = {
        "message": "Face image captured successfully.",
        "face_count": student.faces.count(),
        "student": _student_response(student),
    }
    if encoding is None:
        response["warning"] = "Image saved without encoding. Install face_recognition for recognition support."
    return jsonify(response)


@students_bp.delete("/<int:student_id>")
@role_required("admin")
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    sid = student.student_id

    if student.attendance_records.count():
        return jsonify(
            {"error": "Cannot delete student with attendance records. Deactivate the account instead."}
        ), 400

    db.session.delete(student)
    db.session.commit()
    _cleanup_student_files(sid)

    return jsonify({"message": "Student removed successfully."})


def _cleanup_student_files(student_id: str):
    student_dir = Path(current_app.config["UPLOAD_FOLDER"]) / student_id
    if student_dir.exists():
        shutil.rmtree(student_dir, ignore_errors=True)
