from app.extensions import db


class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)

    sections = db.relationship("Section", back_populates="department", lazy="dynamic")
    students = db.relationship("Student", back_populates="department", lazy="dynamic")
    staff = db.relationship("User", back_populates="department", lazy="dynamic")


class Section(db.Model):
    __tablename__ = "sections"

    id = db.Column(db.Integer, primary_key=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    year = db.Column(db.Integer)
    semester = db.Column(db.String(20))

    department = db.relationship("Department", back_populates="sections")
    students = db.relationship("Student", back_populates="section", lazy="dynamic")
    courses = db.relationship("Course", back_populates="section", lazy="dynamic")


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    schedule_info = db.Column(db.String(200))

    section = db.relationship("Section", back_populates="courses")
    instructor = db.relationship("User", back_populates="courses")
    sessions = db.relationship("AttendanceSession", back_populates="course", lazy="dynamic")
