"""Seed the database with demo users and organizational data."""

from app import create_app
from app.extensions import db
from app.models.organization import Course, Department, Section
from app.models.user import User

DEFAULT_PASSWORD = "password123"

USERS = [
    ("admin", "admin", "System Administrator", None),
    ("instructor", "instructor", "Demo Instructor", None),
    ("depthead", "department_head", "Demo Department Head", True),
]

DEPT = ("Computer Science", "CS")
SECTION = ("Section A", 3, "I")
COURSE = ("CS301", "Software Engineering")


def seed():
    app = create_app()
    with app.app_context():
        print(f"Using database: {app.config['SQLALCHEMY_DATABASE_URI']}")

        if User.query.filter_by(username="admin").first():
            print("Database already seeded.")
            return

        dept = Department(name=DEPT[0], code=DEPT[1])
        db.session.add(dept)
        db.session.flush()

        section = Section(
            department_id=dept.id,
            name=SECTION[0],
            year=SECTION[1],
            semester=SECTION[2],
        )
        db.session.add(section)
        db.session.flush()

        instructor = User(
            username="instructor",
            role="instructor",
            full_name="Demo Instructor",
            email="instructor@amu.edu.et",
        )
        instructor.set_password(DEFAULT_PASSWORD)
        db.session.add(instructor)
        db.session.flush()

        dept_head = User(
            username="depthead",
            role="department_head",
            full_name="Demo Department Head",
            email="depthead@amu.edu.et",
            department_id=dept.id,
        )
        dept_head.set_password(DEFAULT_PASSWORD)
        db.session.add(dept_head)

        admin = User(
            username="admin",
            role="admin",
            full_name="System Administrator",
            email="admin@amu.edu.et",
        )
        admin.set_password(DEFAULT_PASSWORD)
        db.session.add(admin)

        course = Course(
            code=COURSE[0],
            name=COURSE[1],
            section_id=section.id,
            instructor_id=instructor.id,
            schedule_info="Mon/Wed 10:00 AM",
        )
        db.session.add(course)
        db.session.commit()

        print("Seed complete.")
        print(f"  admin      / {DEFAULT_PASSWORD}")
        print(f"  instructor / {DEFAULT_PASSWORD}")
        print(f"  depthead   / {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    seed()
