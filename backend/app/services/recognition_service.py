import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from app.extensions import db
from app.models.organization import Course
from app.models.student import Student, StudentFace
from app.services.face_service import FACE_LIBS_AVAILABLE, extract_face_encoding

_prepared_models: dict[int, "PreparedModel"] = {}


@dataclass
class PreparedModel:
    instructor_id: int
    course_id: int
    course_code: str
    course_name: str
    section_id: int
    section_name: str
    department_name: str
    tolerance: float
    prepared_at: datetime
    entries: list[dict] = field(default_factory=list)
    model_path: str | None = None

    @property
    def student_count(self) -> int:
        return len(self.entries)

    @property
    def encoding_count(self) -> int:
        return sum(len(entry["encodings"]) for entry in self.entries)

    def to_status_dict(self) -> dict:
        return {
            "trained": True,
            "course_id": self.course_id,
            "course_code": self.course_code,
            "course_name": self.course_name,
            "section_id": self.section_id,
            "section_name": self.section_name,
            "department_name": self.department_name,
            "student_count": self.student_count,
            "encoding_count": self.encoding_count,
            "tolerance": self.tolerance,
            "prepared_at": self.prepared_at.isoformat(),
            "model_path": self.model_path,
        }


def get_prepared_model(instructor_id: int) -> PreparedModel | None:
    return _prepared_models.get(instructor_id)


def get_model_status(instructor_id: int) -> dict:
    model = get_prepared_model(instructor_id)
    if not model:
        return {"trained": False}
    return model.to_status_dict()


def clear_prepared_model(instructor_id: int) -> None:
    _prepared_models.pop(instructor_id, None)


def match_face_encoding(model: PreparedModel, encoding: list[float]) -> tuple[dict | None, float]:
    if not FACE_LIBS_AVAILABLE:
        raise ValueError("face_recognition is required for live recognition.")

    import face_recognition
    import numpy as np

    unknown = np.array(encoding)
    best_entry = None
    best_distance = 1.0

    for entry in model.entries:
        known_encodings = [np.array(item) for item in entry["encodings"]]
        distances = face_recognition.face_distance(known_encodings, unknown)
        min_distance = float(np.min(distances))
        if min_distance < best_distance:
            best_distance = min_distance
            best_entry = entry

    if best_entry is not None and best_distance <= model.tolerance:
        return best_entry, best_distance

    return None, best_distance


def _load_face_encodings(student: Student) -> list[list[float]]:
    encodings: list[list[float]] = []

    for face in student.faces.order_by(StudentFace.captured_at):
        if face.encoding_json:
            try:
                encoding = json.loads(face.encoding_json)
            except json.JSONDecodeError:
                encoding = None
            if encoding:
                encodings.append(encoding)
                continue

        if FACE_LIBS_AVAILABLE and face.image_path:
            image_path = Path(face.image_path)
            if image_path.is_file():
                try:
                    encoding = extract_face_encoding(image_path.read_bytes())
                except Exception:
                    encoding = None
                if encoding:
                    face.encoding_json = json.dumps(encoding)
                    encodings.append(encoding)

    if encodings:
        db.session.commit()

    return encodings


def prepare_for_course(
    instructor_id: int,
    course_id: int,
    *,
    encodings_folder: str,
    tolerance: float,
) -> dict:
    course = Course.query.get(course_id)
    if not course:
        raise ValueError("Course not found.")
    if course.instructor_id != instructor_id:
        raise PermissionError("You are not assigned to this course.")

    section = course.section
    if not section:
        raise ValueError("Course section not found.")

    students = (
        Student.query.filter_by(section_id=section.id, is_active=True)
        .order_by(Student.full_name)
        .all()
    )

    entries = []
    skipped = []
    warnings = []

    for student in students:
        encodings = _load_face_encodings(student)
        if not encodings:
            skipped.append(
                {
                    "student_id": student.student_id,
                    "full_name": student.full_name,
                    "reason": "No usable face encodings. Re-capture faces with face_recognition installed.",
                }
            )
            continue

        entries.append(
            {
                "student_db_id": student.id,
                "student_id": student.student_id,
                "full_name": student.full_name,
                "encodings": encodings,
            }
        )

    if not entries:
        raise ValueError(
            "No students with face encodings found for this section. "
            "Register students and capture faces first."
        )

    if skipped:
        warnings.append(
            f"{len(skipped)} student(s) skipped because they have no usable encodings."
        )

    prepared_at = datetime.now(timezone.utc)
    model_payload = {
        "instructor_id": instructor_id,
        "course_id": course.id,
        "course_code": course.code,
        "course_name": course.name,
        "section_id": section.id,
        "section_name": section.name,
        "department_name": section.department.name if section.department else None,
        "tolerance": tolerance,
        "prepared_at": prepared_at.isoformat(),
        "entries": entries,
    }

    encodings_dir = Path(encodings_folder)
    encodings_dir.mkdir(parents=True, exist_ok=True)
    model_path = encodings_dir / f"course_{course.id}.json"
    model_path.write_text(json.dumps(model_payload, indent=2), encoding="utf-8")

    model = PreparedModel(
        instructor_id=instructor_id,
        course_id=course.id,
        course_code=course.code,
        course_name=course.name,
        section_id=section.id,
        section_name=section.name,
        department_name=section.department.name if section.department else "",
        tolerance=tolerance,
        prepared_at=prepared_at,
        entries=entries,
        model_path=str(model_path),
    )
    _prepared_models[instructor_id] = model

    return {
        "message": "Face recognition prepared successfully.",
        "status": model.to_status_dict(),
        "skipped_students": skipped,
        "warnings": warnings,
    }
