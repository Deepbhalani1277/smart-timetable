# Smart Classroom Scheduler

React + TypeScript + Vite frontend for a university timetable administration tool. The app connects to an existing Python Flask REST API and does not create or replace the backend.

## Included screens

- Dashboard with live collection totals and connection status
- Subjects, faculty, classrooms, student groups, and time slots
- CRUD forms with validation, refresh, pagination, empty/error states, and delete confirmation
- Faculty-to-subject assignments
- Student-group-to-subject assignments
- Responsive navigation for desktop, tablet, and mobile widths

## Local development

1. Install Node.js LTS and pnpm.
2. Install dependencies from the workspace root:

   ```bash
   pnpm install
   ```

3. Copy `.env.example` to `.env`.
4. Set `VITE_API_BASE_URL` to the URL of the Flask API, normally `http://127.0.0.1:5000/api`.
5. Start the frontend:

   ```bash
   pnpm dev
   ```

   In the Replit workspace, use the artifact workflow instead:

   ```bash
   pnpm --filter @workspace/smart-classroom-scheduler run dev
   ```

6. Create a production build:

   ```bash
   PORT=5173 BASE_PATH=/ pnpm --filter @workspace/smart-classroom-scheduler run build
   ```

## Flask API contract

The frontend expects these routes below the configured API base URL:

- `GET/POST /subjects`, `GET/PUT/PATCH/DELETE /subjects/:id`
- `GET/POST /faculty`, `GET/PUT/PATCH/DELETE /faculty/:id`
- `GET/POST /classrooms`, `GET/PUT/PATCH/DELETE /classrooms/:id`
- `GET/POST /student-groups`, `GET/PUT/PATCH/DELETE /student-groups/:id`
- `GET/POST /time-slots`, `GET/PUT/PATCH/DELETE /time-slots/:id`
- `GET/POST/DELETE /faculty/:facultyId/subjects`
- `GET/POST/DELETE /student-groups/:groupId/subjects`
- `GET /health` (override with `VITE_API_HEALTH_PATH` if needed)

Collection endpoints may return an array or a common envelope such as `{ data: [] }`, `{ items: [] }`, `{ results: [] }`, or `{ records: [] }`. Paginated responses can expose `total`; the client walks pages until the collection is complete.

The assignment create request uses `{ "subject_id": "<id>" }`, matching the usual Flask-SQLAlchemy relationship naming. If the backend uses a different body key or enum value, update the payload mapping in `src/pages/AssignmentPage.tsx` and the form options in `src/pages/ResourcePage.tsx`.

## CORS

Configure Flask-CORS on the backend for the frontend development origin. Do not disable security checks globally. For local development, allow the Vite origin (for example `http://localhost:5173` or the Replit preview origin) and keep the API URL in the frontend environment file.