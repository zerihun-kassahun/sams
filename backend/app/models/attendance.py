from datetime import datetime

from app.extensions import db


class AttendanceSession(db.Model):
    __tablename__ = "attendance_sessions"

    STATUSES = ("active", "closed")

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    session_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), default="active", nullable=False)

    course = db.relationship("Course", back_populates="sessions")
    instructor = db.relationship("User")
    records = db.relationship("AttendanceRecord", back_populates="session", lazy="dynamic")


class AttendanceRecord(db.Model):
    __tablename__ = "attendance_records"
    __table_args__ = (
        db.UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    status = db.Column(db.String(20), default="present", nullable=False)
    recognized_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    confidence_score = db.Column(db.Float)

    session = db.relationship("AttendanceSession", back_populates="records")
    student = db.relationship("Student", back_populates="attendance_records")
