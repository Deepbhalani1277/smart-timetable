# Smart Classroom & Timetable Scheduler — Backend

REST API backend for automatically generating clash-free weekly academic timetables.

## Technology Stack

- Python 3.11+, Flask 3.1, Flask-SQLAlchemy 3.1, SQLAlchemy 2.1
- Flask-Migrate 4.1 (Alembic), Flask-CORS 5.0, python-dotenv 1.1
- pytest 8.3, SQLite (development)

## Directory Structure

```
backend/
├── app/
│   ├── models/          subject, faculty, classroom, student_group, time_slot, timetable
│   ├── routes/          health, subjects, faculty, classrooms, student_groups, time_slots
│   ├── services/        subjects, faculty, classrooms, student_groups, time_slots, utils
│   ├── __init__.py      Application factory
│   ├── config.py        Config / DevelopmentConfig / TestingConfig
│   └── extensions.py    db, migrate, cors
├── migrations/          Alembic migration history
├── tests/               25 model tests + 104 API tests
├── .env.example
├── requirements.txt
└── run.py
```

## Setup (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env   # set SECRET_KEY
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FLASK_ENV` | `development` | `development` or `testing` |
| `SECRET_KEY` | `change-me-in-production` | Flask session secret |
| `DATABASE_URL` | `sqlite:///timetable.db` | SQLAlchemy URI (resolves to `instance/timetable.db`) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

## Running the Server

```powershell
python run.py        # http://localhost:5000
```

## Running Tests

```powershell
pytest tests/ -v
```

## Migrations

```powershell
flask --app run:app db migrate -m describe_change   # generate
flask --app run:app db upgrade                       # apply
flask --app run:app db downgrade                     # revert one step
```

---

## API Reference

All endpoints are prefixed with `/api`. Responses use `{"data": ...}` for single resources and `{"data": [...], "pagination": {...}}` for collections.

### Health

```
GET /api/health
→ {"status": "healthy", "api_name": "...", "version": "1.0.0"}
```

### Subjects  `/api/subjects`

| Method | Path | Description |
|---|---|---|
| GET | `/api/subjects` | List (filterable, paginated) |
| GET | `/api/subjects/<id>` | Get one |
| POST | `/api/subjects` | Create |
| PUT | `/api/subjects/<id>` | Full update |
| PATCH | `/api/subjects/<id>` | Partial update |
| DELETE | `/api/subjects/<id>` | Delete (blocked if in timetable) |

Filters: `department`, `semester`, `subject_type`, `required_room_type`

Example create body:
```json
{
  "name": "Data Structures",
  "code": "CS301",
  "department": "CS",
  "semester": 3,
  "weekly_sessions": 3,
  "duration_minutes": 60,
  "subject_type": "theory",
  "required_room_type": "classroom",
  "requires_consecutive_slots": false
}
```

### Faculty  `/api/faculty`

| Method | Path | Description |
|---|---|---|
| GET | `/api/faculty` | List |
| GET | `/api/faculty/<id>` | Get one |
| POST | `/api/faculty` | Create |
| PUT | `/api/faculty/<id>` | Full update |
| PATCH | `/api/faculty/<id>` | Partial update |
| DELETE | `/api/faculty/<id>` | Delete (blocked if in timetable) |
| GET | `/api/faculty/<id>/subjects` | List assigned subjects |
| POST | `/api/faculty/<id>/subjects` | Assign subjects |
| DELETE | `/api/faculty/<id>/subjects/<sid>` | Remove assignment |

Filters: `department`, `designation`

Example create body:
```json
{"name": "Dr. Smith", "department": "CS", "email": "smith@uni.edu", "designation": "Professor"}
```

Assignment body:
```json
{"subject_ids": [1, 2, 3]}
```

### Classrooms  `/api/classrooms`

Filters: `building`, `room_type`, `min_capacity`, `has_projector`, `has_computers`

Example create body:
```json
{"name": "Room 101", "building": "Block A", "capacity": 40, "room_type": "classroom", "has_projector": true, "has_computers": false}
```

### Student Groups  `/api/student-groups`

Filters: `department`, `academic_year`, `semester`, `division`

Example create body:
```json
{"name": "CS-A", "department": "CS", "academic_year": "2024-25", "semester": 3, "student_count": 60}
```

Assignment endpoints mirror faculty: `GET/POST /api/student-groups/<id>/subjects`, `DELETE /api/student-groups/<id>/subjects/<sid>`

### Time Slots  `/api/time-slots`

Filters: `day_of_week`, `is_break`

Example create body:
```json
{"day_of_week": "Monday", "start_time": "09:00", "end_time": "10:00", "is_break": false}
```

Valid days: `Monday Tuesday Wednesday Thursday Friday Saturday Sunday`

Overlapping slots on the same day are rejected. Adjacent slots (end of one = start of next) are allowed.

---

## Pagination

All collection endpoints accept `?page=1&per_page=20` (max 100). Response includes:
```json
{"data": [...], "pagination": {"page": 1, "per_page": 20, "total": 45, "total_pages": 3}}
```

## Error Format

```json
{"error": "Validation Error", "message": "One or more fields are invalid.", "details": {"field": "reason"}}
```

HTTP codes: `200` ok · `201` created · `204` deleted · `400` bad request · `404` not found · `409` conflict · `500` server error

## CORS

Set `CORS_ORIGINS` in `.env`:
```
CORS_ORIGINS=http://localhost:5173,https://your-app.lovable.app
```

## Current Scope (Parts 1 & 2)

- Application factory, config, migrations
- Models: Subject, Faculty, Classroom, StudentGroup, TimeSlot, Timetable, TimetableEntry
- Full CRUD APIs for all five academic resources
- Faculty–subject and student-group–subject assignment management
- Validation, pagination, filtering, consistent JSON error responses
- 129 automated tests (all passing)

## Planned Future Parts

- Part 3: Scheduling constraint configuration
- Part 4: CSP-based timetable generation engine
- Part 5: Timetable management and editing
- Part 6: PDF/CSV export and reporting
