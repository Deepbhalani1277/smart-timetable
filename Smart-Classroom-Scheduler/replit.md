# Smart Classroom Scheduler

An administration frontend for configuring university scheduling resources and relationships through an existing Flask REST API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/smart-classroom-scheduler run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/smart-classroom-scheduler/` — React/Vite frontend
- `artifacts/smart-classroom-scheduler/src/lib/api.ts` — configurable Flask API client and pagination handling
- `artifacts/smart-classroom-scheduler/src/pages/` — dashboard, resource CRUD, and assignment screens
- `.env.example` in the frontend artifact — local Flask API configuration

## Architecture decisions

- The frontend calls the user's existing Flask API and does not create a second backend or database.
- Dashboard totals and collection pages walk paginated responses instead of treating the first page as the full dataset.
- When the API is unavailable, live values remain unavailable rather than being replaced by sample data.

## Product

The app provides CRUD management for subjects, faculty, classrooms, student groups, and time slots, plus faculty-subject and student-group-subject assignment workflows.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Set `VITE_API_BASE_URL` and configure Flask-CORS before expecting live records.
- Assignment creation currently sends the Flask-style `{ subject_id }` request body.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
