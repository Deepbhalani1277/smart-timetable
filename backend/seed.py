import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.timetables import seed_database, generate_timetable

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        print("[1/2] Seeding academic resources (Subjects, Faculty, Classrooms, Groups, Time Slots)...")
        summary = seed_database()
        print("Done:", summary)
        print("[2/2] Generating clash-free master timetable...")
        tt, err = generate_timetable({"name": "Master Academic Timetable 2026"})
        if err:
            print("Warning:", err)
        else:
            print(f"Timetable '{tt['name']}' generated successfully with {tt['entries_count']} scheduled entries!")
