from datetime import date, datetime

from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.organization import Course, Department, Section
from app.models.student import Student


def parse_date_param(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def apply_session_date_filters(query, from_date: date | None, to_date: date | None):
    if from_date:
        query = query.filter(AttendanceSession.session_date >= from_date)
    if to_date:
        query = query.filter(AttendanceSession.session_date <= to_date)
    return query


def _attendance_rate(sessions_attended: int, total_sessions: int) -> float:
    if total_sessions == 0:
        return 0.0
    return round((sessions_attended / total_sessions) * 100, 1)


def build_session_report(session: AttendanceSession) -> dict:
    section = session.course.section
    students = (
        Student.query.filter_by(section_id=section.id, is_active=True)
        .order_by(Student.full_name)
        .all()
    )
    records = session.records.all()
    present_by_student = {record.student_id: record for record in records}

    student_rows = []
    for student in students:
        record = present_by_student.get(student.id)
        student_rows.append(
            {
                "student_db_id": student.id,
                "student_id": student.student_id,
                "full_name": student.full_name,
                "status": "present" if record else "absent",
                "recognized_at": record.recognized_at.isoformat() if record else None,
                "confidence_score": record.confidence_score if record else None,
            }
        )

    present_count = len(present_by_student)
    total_students = len(students)

    return {
        "session": {
            "id": session.id,
            "course_id": session.course_id,
            "course_code": session.course.code,
            "course_name": session.course.name,
            "section_name": section.name,
            "session_date": session.session_date.isoformat(),
            "start_time": session.start_time.isoformat(),
            "end_time": session.end_time.isoformat() if session.end_time else None,
            "status": session.status,
        },
        "summary": {
            "total_students": total_students,
            "present_count": present_count,
            "absent_count": max(total_students - present_count, 0),
            "attendance_rate": _attendance_rate(present_count, total_students),
        },
        "students": student_rows,
    }


def build_instructor_course_summary(
    course: Course,
    sessions: list[AttendanceSession],
) -> dict:
    students = (
        Student.query.filter_by(section_id=course.section_id, is_active=True)
        .order_by(Student.full_name)
        .all()
    )
    total_sessions = len(sessions)

    student_rows = []
    rates = []
    for student in students:
        attended = sum(
            1
            for session in sessions
            if any(record.student_id == student.id for record in session.records.all())
        )
        rate = _attendance_rate(attended, total_sessions)
        rates.append(rate)
        student_rows.append(
            {
                "student_db_id": student.id,
                "student_id": student.student_id,
                "full_name": student.full_name,
                "sessions_attended": attended,
                "total_sessions": total_sessions,
                "attendance_rate": rate,
            }
        )

    return {
        "course": {
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "section_name": course.section.name if course.section else None,
        },
        "summary": {
            "total_sessions": total_sessions,
            "total_students": len(students),
            "average_attendance_rate": round(sum(rates) / len(rates), 1) if rates else 0.0,
        },
        "students": student_rows,
    }


def build_department_summary(
    department: Department,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> dict:
    sections = Section.query.filter_by(department_id=department.id).order_by(Section.name).all()
    section_rows = []
    section_rates = []

    total_students = 0
    total_sessions = 0

    for section in sections:
        students = section.students.filter_by(is_active=True).all()
        student_count = len(students)
        student_ids = {student.id for student in students}

        course_ids = [course.id for course in section.courses.all()]
        sessions_query = AttendanceSession.query.filter(
            AttendanceSession.course_id.in_(course_ids),
            AttendanceSession.status == "closed",
        )
        sessions_query = apply_session_date_filters(sessions_query, from_date, to_date)
        sessions = sessions_query.all()
        session_count = len(sessions)

        if student_count and session_count:
            attended_total = 0
            student_rates = []
            for student in students:
                attended = sum(
                    1
                    for session in sessions
                    if any(record.student_id == student.id for record in session.records.all())
                )
                attended_total += attended
                student_rates.append(_attendance_rate(attended, session_count))
            average_rate = round(sum(student_rates) / len(student_rates), 1)
        else:
            attended_total = 0
            average_rate = 0.0

        section_rates.append(average_rate)
        total_students += student_count
        total_sessions += session_count

        section_rows.append(
            {
                "section_id": section.id,
                "section_name": section.name,
                "year": section.year,
                "semester": section.semester,
                "student_count": student_count,
                "session_count": session_count,
                "present_records": attended_total,
                "average_attendance_rate": average_rate,
            }
        )

    return {
        "department": {
            "id": department.id,
            "name": department.name,
            "code": department.code,
        },
        "filters": {
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
        },
        "sections": section_rows,
        "totals": {
            "sections": len(section_rows),
            "students": total_students,
            "sessions": total_sessions,
            "average_attendance_rate": (
                round(sum(section_rates) / len(section_rates), 1) if section_rates else 0.0
            ),
        },
    }


def build_section_detail_report(
    section: Section,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> dict:
    students = section.students.filter_by(is_active=True).order_by(Student.full_name).all()
    course_ids = [course.id for course in section.courses.all()]

    sessions_query = AttendanceSession.query.filter(
        AttendanceSession.course_id.in_(course_ids),
        AttendanceSession.status == "closed",
    )
    sessions_query = apply_session_date_filters(sessions_query, from_date, to_date)
    sessions = sessions_query.order_by(AttendanceSession.session_date.desc()).all()
    total_sessions = len(sessions)

    student_rows = []
    rates = []
    for student in students:
        attended = sum(
            1
            for session in sessions
            if any(record.student_id == student.id for record in session.records.all())
        )
        rate = _attendance_rate(attended, total_sessions)
        rates.append(rate)
        student_rows.append(
            {
                "student_db_id": student.id,
                "student_id": student.student_id,
                "full_name": student.full_name,
                "sessions_attended": attended,
                "total_sessions": total_sessions,
                "attendance_rate": rate,
            }
        )

    session_rows = [
        {
            "id": session.id,
            "course_code": session.course.code,
            "course_name": session.course.name,
            "session_date": session.session_date.isoformat(),
            "present_count": session.records.count(),
            "status": session.status,
        }
        for session in sessions
    ]

    return {
        "section": {
            "id": section.id,
            "name": section.name,
            "year": section.year,
            "semester": section.semester,
            "department_name": section.department.name if section.department else None,
        },
        "filters": {
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
        },
        "summary": {
            "total_sessions": total_sessions,
            "total_students": len(students),
            "average_attendance_rate": round(sum(rates) / len(rates), 1) if rates else 0.0,
        },
        "sessions": session_rows,
        "students": student_rows,
    }
