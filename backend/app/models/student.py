from datetime import datetime

from app.extensions import db


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(30), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120))
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    consent_given = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    department = db.relationship("Department", back_populates="students")
    section = db.relationship("Section", back_populates="students")
    faces = db.relationship(
        "StudentFace",
        back_populates="student",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    attendance_records = db.relationship("AttendanceRecord", back_populates="student", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "student_id": self.student_id,
            "full_name": self.full_name,
            "email": self.email,
            "department_id": self.department_id,
            "section_id": self.section_id,
            "is_active": self.is_active,
            "consent_given": self.consent_given,
            "face_count": self.faces.count(),
        }


class StudentFace(db.Model):
    __tablename__ = "student_faces"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    encoding_json = db.Column(db.Text)
    captured_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)

    student = db.relationship("Student", back_populates="faces")
