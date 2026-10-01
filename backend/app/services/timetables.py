import random
from datetime import time
from app.extensions import db
from app.models.timetable import Timetable, TimetableEntry
from app.models.subject import Subject
from app.models.faculty import Faculty
from app.models.classroom import Classroom
from app.models.student_group import StudentGroup
from app.models.time_slot import TimeSlot
from app.services.utils import serialize_datetime, serialize_time, paginate_query, parse_pagination


def serialize_entry(entry):
    return {
        "id": entry.id,
        "timetable_id": entry.timetable_id,
        "batch": getattr(entry, "batch", None),
        "subject": {
            "id": entry.subject.id,
            "name": entry.subject.name,
            "code": entry.subject.code,
            "semester": getattr(entry.subject, "semester", None),
            "subject_type": entry.subject.subject_type,
            "required_room_type": entry.subject.required_room_type,
        } if entry.subject else None,
        "faculty": {
            "id": entry.faculty.id,
            "name": entry.faculty.name,
            "email": entry.faculty.email,
            "designation": entry.faculty.designation,
        } if entry.faculty else None,
        "classroom": {
            "id": entry.classroom.id,
            "name": entry.classroom.name,
            "building": entry.classroom.building,
            "capacity": entry.classroom.capacity,
            "room_type": entry.classroom.room_type,
        } if entry.classroom else None,
        "student_group": {
            "id": entry.student_group.id,
            "name": entry.student_group.name,
            "department": entry.student_group.department,
            "semester": entry.student_group.semester,
            "student_count": entry.student_group.student_count,
        } if entry.student_group else None,
        "time_slot": {
            "id": entry.time_slot.id,
            "day_of_week": entry.time_slot.day_of_week,
            "start_time": serialize_time(entry.time_slot.start_time),
            "end_time": serialize_time(entry.time_slot.end_time),
            "is_break": entry.time_slot.is_break,
            "label": getattr(entry.time_slot, "label", None),
        } if entry.time_slot else None,
    }


def serialize_timetable(tt, include_entries=False):
    res = {
        "id": tt.id,
        "name": tt.name,
        "department": tt.department,
        "semester": tt.semester,
        "status": tt.status,
        "generation_status": tt.generation_status,
        "entries_count": len(tt.entries) if tt.entries else 0,
        "created_at": serialize_datetime(tt.created_at),
        "updated_at": serialize_datetime(tt.updated_at),
    }
    if include_entries and tt.entries:
        res["entries"] = [serialize_entry(e) for e in tt.entries]
    elif include_entries:
        res["entries"] = []
    return res


def list_timetables(args):
    page, per_page = parse_pagination(args)
    q = Timetable.query
    if "department" in args:
        q = q.filter(Timetable.department == args["department"])
    if "semester" in args:
        try:
            q = q.filter(Timetable.semester == int(args["semester"]))
        except ValueError:
            pass
    if "status" in args:
        q = q.filter(Timetable.status == args["status"])

    q = q.order_by(Timetable.created_at.desc())
    items, pagination = paginate_query(q, page, per_page)
    return [serialize_timetable(t, include_entries=False) for t in items], pagination


def get_timetable(timetable_id):
    tt = db.session.get(Timetable, timetable_id)
    if not tt:
        return None
    return serialize_timetable(tt, include_entries=True)


def delete_timetable(timetable_id):
    tt = db.session.get(Timetable, timetable_id)
    if not tt:
        return False
    db.session.delete(tt)
    db.session.commit()
    return True


def generate_timetable(data):
    name = (data or {}).get("name") or "Generated Timetable"
    department = (data or {}).get("department")
    semester = (data or {}).get("semester")

    # Fetch groups
    group_query = StudentGroup.query
    if department:
        group_query = group_query.filter(StudentGroup.department == department)
    if semester:
        try:
            group_query = group_query.filter(StudentGroup.semester == int(semester))
        except ValueError:
            pass
    groups = group_query.all()
    if not groups:
        return None, {"student_groups": "No student groups found to schedule."}

    # Fetch valid (non-break) time slots
    slots = TimeSlot.query.filter(TimeSlot.is_break.is_(False)).all()
    if not slots:
        return None, {"time_slots": "No non-break time slots defined. Please create time slots first."}

    day_order = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}
    slots.sort(key=lambda s: (day_order.get(s.day_of_week, 99), s.start_time))

    # Fetch classrooms
    classrooms = Classroom.query.all()
    if not classrooms:
        return None, {"classrooms": "No classrooms defined. Please create classrooms first."}

    # Fetch all faculty & subjects as fallback
    all_faculty = Faculty.query.all()
    all_subjects = Subject.query.all()

    # Track clash sets
    busy_faculty = set()        # (faculty_id, slot_id)
    busy_rooms = set()          # (classroom_id, slot_id)
    busy_groups = set()         # (group_id, slot_id) for whole-class lectures
    busy_group_batches = set()  # (group_id, batch, slot_id) for laboratory batches
    group_day_sub_count = {}    # (group_id, batch, day, subject_id) -> count

    new_timetable = Timetable(
        name=name,
        department=department,
        semester=int(semester) if semester else None,
        status="draft",
        generation_status="completed"
    )
    db.session.add(new_timetable)
    db.session.flush()

    entries_created = 0

    for group in groups:
        # Get subjects for this group
        subjects = list(group.subjects)
        if not subjects:
            subjects = [s for s in all_subjects if (s.semester == group.semester or not s.semester)]

        if not subjects:
            continue

        for subject in subjects:
            is_lab = subject.subject_type == "practical" or subject.required_room_type == "laboratory"
            sessions_needed = max(1, subject.weekly_sessions or (2 if is_lab else 3))

            eligible_faculty = list(subject.faculty_members)
            if not eligible_faculty:
                eligible_faculty = [f for f in all_faculty if f.department == subject.department] or all_faculty

            eligible_rooms = [
                r for r in classrooms 
                if r.room_type == subject.required_room_type and r.capacity >= (group.student_count * 0.4 if is_lab else group.student_count * 0.8)
            ]
            if not eligible_rooms:
                eligible_rooms = [r for r in classrooms if r.room_type == subject.required_room_type] or classrooms

            batches = ["A", "B", "C"] if is_lab else [None]

            for batch in batches:
                sessions_placed = 0
                candidate_slots = list(slots)
                seed_val = 42 + group.id * 31 + subject.id * 17 + (ord(batch) if batch else 0)
                random.seed(seed_val)
                random.shuffle(candidate_slots)

                for slot in candidate_slots:
                    if sessions_placed >= (1 if is_lab else sessions_needed):
                        break

                    # Check group clash
                    if (group.id, slot.id) in busy_groups:
                        continue
                    if batch and (group.id, batch, slot.id) in busy_group_batches:
                        continue
                    if not batch and any((group.id, b, slot.id) in busy_group_batches for b in ("A", "B", "C")):
                        continue

                    day_key = (group.id, batch, slot.day_of_week, subject.id)
                    if group_day_sub_count.get(day_key, 0) >= 1:
                        continue

                    # Find available faculty
                    faculty_cand = None
                    for f in eligible_faculty:
                        if (f.id, slot.id) not in busy_faculty:
                            faculty_cand = f
                            break
                    if not faculty_cand and eligible_faculty:
                        faculty_cand = eligible_faculty[0]

                    # Find available room
                    room_cand = None
                    for r in eligible_rooms:
                        if (r.id, slot.id) not in busy_rooms:
                            room_cand = r
                            break
                    if not room_cand and eligible_rooms:
                        room_cand = eligible_rooms[0]

                    if faculty_cand and room_cand:
                        if batch:
                            busy_group_batches.add((group.id, batch, slot.id))
                        else:
                            busy_groups.add((group.id, slot.id))

                        busy_faculty.add((faculty_cand.id, slot.id))
                        busy_rooms.add((room_cand.id, slot.id))
                        group_day_sub_count[day_key] = group_day_sub_count.get(day_key, 0) + 1

                        entry = TimetableEntry(
                            timetable_id=new_timetable.id,
                            subject_id=subject.id,
                            faculty_id=faculty_cand.id,
                            classroom_id=room_cand.id,
                            student_group_id=group.id,
                            time_slot_id=slot.id,
                            batch=batch,
                        )
                        db.session.add(entry)
                        sessions_placed += 1
                        entries_created += 1

    if entries_created == 0:
        new_timetable.generation_status = "failed"
        db.session.commit()
        return None, {"error": "Could not schedule any sessions. Check subjects, rooms, and faculty allocations."}

    db.session.commit()
    return serialize_timetable(new_timetable, include_entries=True), None


def seed_database():
    """Populates realistic starter data matching official university timetable standards (CHARUSAT/DEPSTAR),
    including multi-semester faculty teaching (5th Sem & 3rd Sem) and batch-wise laboratory divisions."""
    
    # 1. Subjects: 5th Semester (from PDF) + 3rd Semester
    sample_subjects_5th = [
        {"name": "Fundamentals of Operating System Design", "code": "CEUC301", "department": "Information Technology", "semester": 5, "weekly_sessions": 3, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Machine Learning", "code": "CSUC301", "department": "Information Technology", "semester": 5, "weekly_sessions": 3, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Data Engineering", "code": "ITUC301", "department": "Information Technology", "semester": 5, "weekly_sessions": 3, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Advanced Web Development Frameworks", "code": "ITUE301", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "laboratory", "requires_consecutive_slots": False},
        {"name": "Introduction to Research Methodology", "code": "CSUA301", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Competitive Programming Essentials", "code": "CEUA301", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Big Data Analytics", "code": "CSUE301", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Internet of Things", "code": "CSUE302", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Digital Image Processing", "code": "CEUE301", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Fundamentals of Game Development", "code": "CEUE302", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Ethical Hacking Essentials", "code": "ITUE302", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Network Defence Essentials", "code": "ITUE303", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Communication and Soft Skills", "code": "HSUA301", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "French 1", "code": "HSUS301", "department": "Information Technology", "semester": 5, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "classroom", "requires_consecutive_slots": False},
    ]

    sample_subjects_3rd = [
        {"name": "Data Structures & Algorithms", "code": "ITUC201", "department": "Information Technology", "semester": 3, "weekly_sessions": 3, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Data Structures Lab", "code": "ITUC201-P", "department": "Information Technology", "semester": 3, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "laboratory", "requires_consecutive_slots": False},
        {"name": "Object Oriented Programming with Java", "code": "ITUC202", "department": "Information Technology", "semester": 3, "weekly_sessions": 3, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Java OOP Lab", "code": "ITUC202-P", "department": "Information Technology", "semester": 3, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "laboratory", "requires_consecutive_slots": False},
        {"name": "Digital Electronics & Logic Design", "code": "ITUC203", "department": "Information Technology", "semester": 3, "weekly_sessions": 3, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "Digital Electronics Lab", "code": "ITUC203-P", "department": "Information Technology", "semester": 3, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "laboratory", "requires_consecutive_slots": False},
        {"name": "Database Management Systems", "code": "ITUC204", "department": "Information Technology", "semester": 3, "weekly_sessions": 3, "duration_minutes": 60, "subject_type": "theory", "required_room_type": "classroom", "requires_consecutive_slots": False},
        {"name": "DBMS Lab", "code": "ITUC204-P", "department": "Information Technology", "semester": 3, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "laboratory", "requires_consecutive_slots": False},
        {"name": "Python Programming", "code": "ITUE201", "department": "Information Technology", "semester": 3, "weekly_sessions": 2, "duration_minutes": 60, "subject_type": "practical", "required_room_type": "laboratory", "requires_consecutive_slots": False},
    ]

    all_seed_subjects = sample_subjects_5th + sample_subjects_3rd
    subject_map = {}
    for s_data in all_seed_subjects:
        existing = Subject.query.filter_by(code=s_data["code"]).first()
        if not existing:
            sub = Subject(**s_data)
            db.session.add(sub)
            subject_map[s_data["code"]] = sub
        else:
            for k, v in s_data.items():
                setattr(existing, k, v)
            subject_map[s_data["code"]] = existing
    db.session.flush()

    # 2. Faculty (from 5IT PDF + multi-semester designations)
    sample_faculty = [
        {"name": "Mr. Hitesh Makwana", "email": "hitesh.it@charusat.ac.in", "department": "Information Technology", "designation": "Associate Professor"},
        {"name": "Ms. Radhika Patel", "email": "radhika.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Dr. Dweepna Garg", "email": "dweepna.it@charusat.ac.in", "department": "Information Technology", "designation": "Professor & Head"},
        {"name": "Dr. Mrugendra Rahevar", "email": "mrugendra.it@charusat.ac.in", "department": "Information Technology", "designation": "Associate Professor"},
        {"name": "Mr. Ashish Katira", "email": "ashish.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Mr. Akash Patel", "email": "akash.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Mr. Mikin Patel", "email": "mikin.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Dr. Parth Goel", "email": "parth.it@charusat.ac.in", "department": "Information Technology", "designation": "Professor"},
        {"name": "Ms. Priyanka Padhiyar", "email": "priyanka.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Mr. Sachin Patel", "email": "sachin.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Mr. Nirav Narayan", "email": "nirav.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Ms. Dipika Damodar", "email": "dipika.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Mr. Arpit Bhatt", "email": "arpit.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Ms. Shital Sharma", "email": "shital.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Dr. Khushi Patel", "email": "khushi.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Dr. Mohini Darji", "email": "mohini.it@charusat.ac.in", "department": "Information Technology", "designation": "Associate Professor"},
        {"name": "Mr. Hardik Parmar", "email": "hardik.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Ms. Chintal Raval", "email": "chintal.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
        {"name": "Mr. Rajesh Patel", "email": "rajesh.it@charusat.ac.in", "department": "Information Technology", "designation": "Associate Professor"},
        {"name": "Mr. Madhav Ajwalia", "email": "madhav.it@charusat.ac.in", "department": "Information Technology", "designation": "Assistant Professor"},
    ]

    faculty_map = {}
    for f_data in sample_faculty:
        existing = Faculty.query.filter_by(email=f_data["email"]).first()
        if not existing:
            fac = Faculty(**f_data)
            db.session.add(fac)
            faculty_map[f_data["email"]] = fac
        else:
            for k, v in f_data.items():
                setattr(existing, k, v)
            faculty_map[f_data["email"]] = existing
    db.session.flush()

    # Multi-Semester Faculty Subject Assignments
    multi_semester_assignments = {
        "hitesh.it@charusat.ac.in": ["CEUC301", "ITUC201", "ITUC201-P"],            # Sem 5 (OSD) + Sem 3 (DS & DS Lab)
        "radhika.it@charusat.ac.in": ["CEUC301", "ITUC202", "ITUC202-P"],           # Sem 5 (OSD) + Sem 3 (Java & Java Lab)
        "dweepna.it@charusat.ac.in": ["CSUC301", "ITUE201"],                        # Sem 5 (ML) + Sem 3 (Python)
        "mrugendra.it@charusat.ac.in": ["CSUC301", "ITUC201", "ITUC201-P"],         # Sem 5 (ML) + Sem 3 (DS)
        "ashish.it@charusat.ac.in": ["CSUC301", "CEUA301", "ITUC204", "ITUC204-P"], # Sem 5 (ML, CPE) + Sem 3 (DBMS)
        "akash.it@charusat.ac.in": ["ITUC301", "ITUC203", "ITUC203-P"],            # Sem 5 (DE) + Sem 3 (Digital Electronics)
        "mikin.it@charusat.ac.in": ["ITUC301", "ITUC203"],
        "parth.it@charusat.ac.in": ["CSUA301", "ITUC203"],
        "priyanka.it@charusat.ac.in": ["ITUE301", "ITUC202-P"],
        "sachin.it@charusat.ac.in": ["CSUE301", "ITUC204"],                         # Sem 5 (BDA) + Sem 3 (DBMS)
        "nirav.it@charusat.ac.in": ["CSUE302"],
        "dipika.it@charusat.ac.in": ["CEUE301"],
        "arpit.it@charusat.ac.in": ["ITUE301", "CEUE302", "ITUE201"],               # Sem 5 (AWDF, FGD) + Sem 3 (Python)
        "shital.it@charusat.ac.in": ["ITUE302"],
        "khushi.it@charusat.ac.in": ["ITUE303"],
        "mohini.it@charusat.ac.in": ["CSUC301"],
        "hardik.it@charusat.ac.in": ["CSUC301"],
        "chintal.it@charusat.ac.in": ["ITUE301"],
        "rajesh.it@charusat.ac.in": ["CEUC301"],
        "madhav.it@charusat.ac.in": ["CEUC301"],
    }

    for email, sub_codes in multi_semester_assignments.items():
        fac = faculty_map.get(email)
        if fac:
            for sc in sub_codes:
                sub = subject_map.get(sc)
                if sub and sub not in fac.subjects:
                    fac.subjects.append(sub)
    db.session.flush()

    # 3. Classrooms & Laboratories
    sample_rooms = [
        {"name": "Room 123", "building": "Academic Block A", "capacity": 70, "room_type": "classroom", "has_projector": True, "has_computers": False},
        {"name": "Room 124", "building": "Academic Block A", "capacity": 70, "room_type": "classroom", "has_projector": True, "has_computers": False},
        {"name": "Room 224", "building": "Academic Block A", "capacity": 70, "room_type": "classroom", "has_projector": True, "has_computers": False},
        {"name": "Room 229", "building": "Academic Block A", "capacity": 70, "room_type": "classroom", "has_projector": True, "has_computers": False},
        {"name": "Lab 104 - Systems Lab", "building": "Science Block B", "capacity": 40, "room_type": "laboratory", "has_projector": True, "has_computers": True},
        {"name": "Lab 105 - Networks Lab", "building": "Science Block B", "capacity": 40, "room_type": "laboratory", "has_projector": True, "has_computers": True},
        {"name": "Lab 109 - AI/ML Lab", "building": "Science Block B", "capacity": 40, "room_type": "laboratory", "has_projector": True, "has_computers": True},
        {"name": "Lab 204 - Web Tech Lab", "building": "Science Block B", "capacity": 40, "room_type": "laboratory", "has_projector": True, "has_computers": True},
        {"name": "Lab 216 - Software Lab", "building": "Science Block B", "capacity": 40, "room_type": "laboratory", "has_projector": True, "has_computers": True},
        {"name": "Lab 314 - Research Lab", "building": "Science Block B", "capacity": 40, "room_type": "laboratory", "has_projector": True, "has_computers": True},
    ]

    room_map = {}
    for r_data in sample_rooms:
        existing = Classroom.query.filter_by(name=r_data["name"]).first()
        if not existing:
            rm = Classroom(**r_data)
            db.session.add(rm)
            room_map[r_data["name"]] = rm
        else:
            for k, v in r_data.items():
                setattr(existing, k, v)
            room_map[r_data["name"]] = existing
    db.session.flush()

    # 4. Student Groups (5th Sem & 3rd Sem)
    sample_groups = [
        {"name": "B. Tech IT - 5th Sem (Div A)", "department": "Information Technology", "academic_year": "2026-27", "semester": 5, "division": "A", "student_count": 65},
        {"name": "B. Tech IT - 5th Sem (Div B)", "department": "Information Technology", "academic_year": "2026-27", "semester": 5, "division": "B", "student_count": 65},
        {"name": "B. Tech IT - 3rd Sem (Div A)", "department": "Information Technology", "academic_year": "2026-27", "semester": 3, "division": "A", "student_count": 60},
        {"name": "B. Tech IT - 3rd Sem (Div B)", "department": "Information Technology", "academic_year": "2026-27", "semester": 3, "division": "B", "student_count": 60},
    ]

    group_map = {}
    for g_data in sample_groups:
        existing = StudentGroup.query.filter_by(name=g_data["name"]).first()
        if not existing:
            grp = StudentGroup(**g_data)
            db.session.add(grp)
            group_map[g_data["name"]] = grp
        else:
            for k, v in g_data.items():
                setattr(existing, k, v)
            group_map[g_data["name"]] = existing
    db.session.flush()

    # Assign subjects according to semester
    for grp_name, grp in group_map.items():
        target_subs = [s for s in subject_map.values() if s.semester == grp.semester]
        for sub in target_subs:
            if sub not in grp.subjects:
                grp.subjects.append(sub)
    db.session.flush()

    # 5. Time Slots (09:10 to 16:20, Mon-Sat)
    slot_definitions = [
        ("09:10", "10:10", "Period 1", False),
        ("10:10", "11:10", "Period 2", False),
        ("11:10", "12:10", "Period 3", False),
        ("12:10", "13:10", "Lunch Break", True),
        ("13:10", "14:10", "Period 4", False),
        ("14:10", "14:20", "Short Break", True),
        ("14:20", "15:20", "Period 5", False),
        ("15:20", "16:20", "Period 6", False),
    ]

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    slot_map = {}
    for day in days:
        for st_str, et_str, lbl, is_brk in slot_definitions:
            st = time.fromisoformat(st_str)
            et = time.fromisoformat(et_str)
            existing = TimeSlot.query.filter_by(day_of_week=day, start_time=st, end_time=et).first()
            if not existing:
                ts = TimeSlot(day_of_week=day, start_time=st, end_time=et, label=lbl, is_break=is_brk)
                db.session.add(ts)
                slot_map[(day, st_str)] = ts
            else:
                existing.label = lbl
                existing.is_break = is_brk
                slot_map[(day, st_str)] = existing
    db.session.flush()

    # 6. Populate Realistic Official Master Timetable (Clash-Free, Multi-Semester + Batches)
    # Clear existing demo master timetables
    existing_tts = Timetable.query.filter(Timetable.name.like("%DEPSTAR IT%")).all()
    for ett in existing_tts:
        db.session.delete(ett)
    db.session.commit()

    master_tt = Timetable(
        name="Academic Year 2026-27 (Odd Term) — DEPSTAR IT",
        department="Information Technology",
        semester=None, # Master timetable covering 5th and 3rd semesters
        status="published",
        generation_status="completed",
    )
    db.session.add(master_tt)
    db.session.flush()

    g5_a = group_map.get("B. Tech IT - 5th Sem (Div A)")
    g3_a = group_map.get("B. Tech IT - 3rd Sem (Div A)")

    # 5th Semester Schedule (Matching 5IT UPDATED TT-1.pdf)
    # Entries: (day, time, sub_code, faculty_email, room_name, batch, group)
    planned_entries = [
        # --- 5th Sem Monday ---
        ("Monday", "09:10", "ITUC301", "akash.it@charusat.ac.in", "Room 229", None, g5_a),
        ("Monday", "10:10", "CSUC301", "dweepna.it@charusat.ac.in", "Room 229", None, g5_a),
        # Monday Lab Batches (Period 4: 13:10 - 14:10)
        ("Monday", "13:10", "CEUC301", "radhika.it@charusat.ac.in", "Lab 314 - Research Lab", "A", g5_a),
        ("Monday", "13:10", "ITUE301", "arpit.it@charusat.ac.in", "Lab 105 - Networks Lab", "B", g5_a),
        ("Monday", "13:10", "ITUC301", "akash.it@charusat.ac.in", "Lab 104 - Systems Lab", "C", g5_a),
        ("Monday", "14:20", "CEUC301", "madhav.it@charusat.ac.in", "Room 224", None, g5_a),

        # --- 5th Sem Tuesday ---
        ("Tuesday", "09:10", "CEUC301", "hitesh.it@charusat.ac.in", "Room 124", None, g5_a),
        ("Tuesday", "10:10", "CSUC301", "mrugendra.it@charusat.ac.in", "Room 124", None, g5_a),
        # Tuesday Lab Batches
        ("Tuesday", "13:10", "ITUC301", "akash.it@charusat.ac.in", "Lab 314 - Research Lab", "A", g5_a),
        ("Tuesday", "13:10", "CEUC301", "radhika.it@charusat.ac.in", "Lab 104 - Systems Lab", "B", g5_a),
        ("Tuesday", "13:10", "ITUE301", "priyanka.it@charusat.ac.in", "Lab 204 - Web Tech Lab", "C", g5_a),

        # --- 5th Sem Wednesday ---
        ("Wednesday", "09:10", "ITUC301", "mikin.it@charusat.ac.in", "Room 123", None, g5_a),
        ("Wednesday", "10:10", "CSUA301", "parth.it@charusat.ac.in", "Room 224", None, g5_a),
        ("Wednesday", "11:10", "CEUA301", "ashish.it@charusat.ac.in", "Room 123", None, g5_a),
        # Wednesday Lab Batches
        ("Wednesday", "13:10", "CSUC301", "ashish.it@charusat.ac.in", "Lab 109 - AI/ML Lab", "A", g5_a),
        ("Wednesday", "13:10", "CSUC301", "mohini.it@charusat.ac.in", "Lab 204 - Web Tech Lab", "B", g5_a),
        ("Wednesday", "13:10", "CSUC301", "hardik.it@charusat.ac.in", "Lab 216 - Software Lab", "C", g5_a),

        # --- 5th Sem Thursday ---
        ("Thursday", "09:10", "CEUC301", "hitesh.it@charusat.ac.in", "Room 124", None, g5_a),
        ("Thursday", "10:10", "CSUC301", "mrugendra.it@charusat.ac.in", "Room 124", None, g5_a),
        ("Thursday", "11:10", "ITUC301", "akash.it@charusat.ac.in", "Room 124", None, g5_a),
        # Thursday Lab Batches
        ("Thursday", "13:10", "CSUA301", "parth.it@charusat.ac.in", "Lab 216 - Software Lab", "A", g5_a),
        ("Thursday", "13:10", "CEUA301", "ashish.it@charusat.ac.in", "Lab 105 - Networks Lab", "B", g5_a),
        ("Thursday", "13:10", "CEUA301", "sachin.it@charusat.ac.in", "Lab 104 - Systems Lab", "C", g5_a),

        # --- 5th Sem Friday ---
        ("Friday", "09:10", "CSUE301", "sachin.it@charusat.ac.in", "Room 123", None, g5_a),
        ("Friday", "10:10", "CSUE302", "nirav.it@charusat.ac.in", "Room 229", None, g5_a),
        # Friday Lab Batches
        ("Friday", "13:10", "ITUE301", "chintal.it@charusat.ac.in", "Lab 104 - Systems Lab", "A", g5_a),
        ("Friday", "13:10", "CSUE301", "sachin.it@charusat.ac.in", "Lab 105 - Networks Lab", "B", g5_a),
        ("Friday", "13:10", "CEUC301", "rajesh.it@charusat.ac.in", "Lab 314 - Research Lab", "C", g5_a),

        # --- 3rd Semester Schedule (Multi-Semester Faculty, 0 Clashes) ---
        # Tue Period 3 (11:10): Mr. Hitesh Makwana teaches 3rd Sem DS (Free from 5th Sem!)
        ("Tuesday", "11:10", "ITUC201", "hitesh.it@charusat.ac.in", "Room 123", None, g3_a),
        # Wed Period 5 (14:20): Ms. Radhika Patel teaches 3rd Sem Java OOP (Free from 5th Sem!)
        ("Wednesday", "14:20", "ITUC202", "radhika.it@charusat.ac.in", "Room 124", None, g3_a),
        # Mon Period 3 (11:10): Dr. Dweepna Garg teaches 3rd Sem Python (Free from 5th Sem!)
        ("Monday", "11:10", "ITUE201", "dweepna.it@charusat.ac.in", "Room 224", None, g3_a),
        # Thu Period 5 (14:20): Mr. Ashish Katira teaches 3rd Sem DBMS (Free from 5th Sem!)
        ("Thursday", "14:20", "ITUC204", "ashish.it@charusat.ac.in", "Room 229", None, g3_a),
        # Fri Period 3 (11:10): Mr. Akash Patel teaches 3rd Sem Digital Electronics (Free from 5th Sem!)
        ("Friday", "11:10", "ITUC203", "akash.it@charusat.ac.in", "Room 123", None, g3_a),

        # 3rd Sem Lab Batches: Thu Period 6 (15:20 - 16:20)
        ("Thursday", "15:20", "ITUC201-P", "hitesh.it@charusat.ac.in", "Lab 104 - Systems Lab", "A", g3_a),
        ("Thursday", "15:20", "ITUC202-P", "radhika.it@charusat.ac.in", "Lab 204 - Web Tech Lab", "B", g3_a),
        ("Thursday", "15:20", "ITUE201", "dweepna.it@charusat.ac.in", "Lab 109 - AI/ML Lab", "C", g3_a),

        # 3rd Sem Lab Batches: Fri Period 5 (14:20 - 15:20)
        ("Friday", "14:20", "ITUC204-P", "ashish.it@charusat.ac.in", "Lab 216 - Software Lab", "A", g3_a),
        ("Friday", "14:20", "ITUC203-P", "akash.it@charusat.ac.in", "Lab 105 - Networks Lab", "B", g3_a),
        ("Friday", "14:20", "ITUC201-P", "mrugendra.it@charusat.ac.in", "Lab 104 - Systems Lab", "C", g3_a),
    ]

    for day, time_str, sub_code, fac_email, room_name, batch, grp in planned_entries:
        ts = slot_map.get((day, time_str))
        sub = subject_map.get(sub_code)
        fac = faculty_map.get(fac_email)
        rm = room_map.get(room_name)

        if ts and sub and fac and rm and grp:
            entry = TimetableEntry(
                timetable_id=master_tt.id,
                subject_id=sub.id,
                faculty_id=fac.id,
                classroom_id=rm.id,
                student_group_id=grp.id,
                time_slot_id=ts.id,
                batch=batch,
            )
            db.session.add(entry)

    db.session.commit()
    return {
        "subjects": len(all_seed_subjects),
        "faculty": len(sample_faculty),
        "classrooms": len(sample_rooms),
        "student_groups": len(sample_groups),
        "time_slots": len(days) * len(slot_definitions),
        "timetable_entries": len(planned_entries),
    }
