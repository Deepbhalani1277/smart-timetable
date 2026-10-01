from app import create_app
from app.extensions import db
from app.models.subject import Subject
from app.models.classroom import Classroom
from app.models.faculty import Faculty

app = create_app()

with app.app_context():
    # Adding dummy Classrooms
    room1 = Classroom(name="Room 101", building="Block A", capacity=60, room_type="classroom", has_projector=True)
    room2 = Classroom(name="Room 102", building="Block A", capacity=60, room_type="classroom", has_projector=True)
    lab1 = Classroom(name="Lab 1", building="Block B", capacity=30, room_type="laboratory", has_computers=True)
    
    # Adding dummy Subjects
    sub1 = Subject(name="Data Structures", code="CS201", department="Computer Science", semester=3, weekly_sessions=4, duration_minutes=60, subject_type="theory", required_room_type="classroom")
    sub2 = Subject(name="Algorithms", code="CS202", department="Computer Science", semester=3, weekly_sessions=3, duration_minutes=60, subject_type="theory", required_room_type="classroom")
    sub3 = Subject(name="Physics Lab", code="PH101L", department="Physics", semester=1, weekly_sessions=1, duration_minutes=120, subject_type="practical", required_room_type="laboratory")
    
    # Adding dummy Faculty
    fac1 = Faculty(name="Dr. John Doe", email="john.doe@example.com", department="Computer Science", designation="Professor", max_hours_per_day=4, max_hours_per_week=20)
    fac2 = Faculty(name="Dr. Jane Smith", email="jane.smith@example.com", department="Physics", designation="Assistant Professor", max_hours_per_day=4, max_hours_per_week=20)
    
    # Associate subjects with faculty
    fac1.subjects.append(sub1)
    fac1.subjects.append(sub2)
    fac2.subjects.append(sub3)
    
    try:
        db.session.add_all([sub1, sub2, sub3, room1, room2, lab1, fac1, fac2])
        db.session.commit()
        print("Dummy data added successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding data: {e}")
