# DocTrackr

Document expiry tracking and automated reminder system for daycare/school operations — manages compliance records for students and employees with scheduled email reminders.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/doctrackr run dev` — run the frontend (port via $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` — Clerk auth (server)
- Required env: `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth (frontend)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + Wouter routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (clerkMiddleware on server, ClerkProvider + Wouter on frontend)
- Email: Nodemailer (SMTP configured per organization)
- Scheduling: node-cron (automated daily reminder job)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas (do not edit manually)
- `lib/db/src/schema/` — Drizzle ORM schema files (8 tables)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/scheduler.ts` — cron-based automated reminder job
- `artifacts/api-server/src/lib/email.ts` — email template builder + Nodemailer sender
- `artifacts/api-server/src/lib/checklist-status.ts` — document status computation logic
- `artifacts/doctrackr/src/pages/` — React page components
- `artifacts/doctrackr/src/components/layout.tsx` — authenticated sidebar layout

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → Zod schemas + React Query hooks. Never write API calls manually on the frontend.
- Single organization model: the system is designed for one daycare center per deployment. Organization settings are global.
- Checklist items are pre-created per person × document type. When a student/employee is created, checklist items auto-generate for all active document types in that category.
- Document status is computed at read time from `expiry_date`, not stored — avoids stale state.
- Reminder scheduling: cron expression is configurable per organization (default: 9 AM daily). The job reads reminder settings from the DB on each run.
- Clerk proxy path `/api/__clerk` is only active in production. In development, Clerk connects directly.

## Product

- Dashboard: 8 compliance metrics (missing, expiring, overdue, active counts) + filterable tables for expiring/overdue/missing items
- Students: CRUD, parent contact info, per-student document checklist with inline date editing and bulk save
- Employees: CRUD, per-employee document checklist (up to 34 document types)
- Compliance: Global cross-person checklist view with filters and manual reminder sending
- Document Types: Manage the catalog of required documents per category (student/employee/both)
- Email Logs: Audit trail of all sent and failed reminders
- Settings: Organization branding, SMTP configuration, reminder schedule

## Database tables

- `organization` — org branding, SMTP sender info, admin CC
- `smtp_settings` — Nodemailer transport config
- `reminder_settings` — cron schedule and reminder interval config
- `students` — student records with parent contact info
- `employees` — employee records
- `document_types` — catalog of required documents
- `checklist_items` — many-to-many: person × document type, tracks expiry date and reminder history
- `email_logs` — full audit trail of sent/failed reminder emails

## Seed data

Pre-seeded: Step Ahead Day Care org, 2 student doc types, 32 employee doc types, 5 students, 5 employees, checklist items with varied statuses, sample email logs.

## Gotchas

- `PATCH /api/checklist/bulk-update` must be registered BEFORE `PATCH /api/checklist/:id` in Express to avoid "bulk-update" being matched as an `:id`.
- Tailwind CSS layer order in index.css must be `@layer theme, base, clerk, components, utilities` — the `clerk` layer prevents Clerk's styles from overriding Tailwind.
- `vite.config.ts` uses `tailwindcss({ optimize: false })` — required for Clerk CSS layer compatibility in production builds.
- Clerk peer dependency warnings about React 19.1.0 vs ~19.0.3 are harmless.
- The scheduler reads cron time from the DB on startup. After changing reminder settings, the server must restart to pick up the new schedule (or add a reload API).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/skills/clerk-auth/SKILL.md` for Clerk proxy and auth setup details
