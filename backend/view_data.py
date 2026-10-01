from app import create_app
from app.extensions import db
from app.models.classroom import Classroom
from app.models.subject import Subject
from app.models.faculty import Faculty

app = create_app()

with app.app_context():
    print("--- Classrooms ---")
    for room in Classroom.query.all():
        print(f"Room: {room.name} | Type: {room.room_type} | Capacity: {room.capacity}")
        
    print("\n--- Subjects ---")
    for sub in Subject.query.all():
        print(f"Subject: {sub.name} ({sub.code}) | Type: {sub.subject_type}")
        
    print("\n--- Faculty ---")
    for fac in Faculty.query.all():
        print(f"Faculty: {fac.name} | Dept: {fac.department}")
