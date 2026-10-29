# Multi-Tenant Operations Hub

A multi-tenant operations and workflow automation dashboard built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Prisma** and **PostgreSQL**.

Multiple organizations share one database. Every row that belongs to a tenant carries an `organizationId`, and every query filters on it — so one organization can never read or change another's data.

## Features

- **Organization sign-up** — registering creates a new tenant and its first `ADMIN` user in a single transaction
- **Session auth** — signed JWT (HS256, `jose`) in an `httpOnly`, `sameSite=lax` cookie; bcrypt password hashing with timing-safe login
- **Clients & projects** — CRUD with status tracking, due dates and pagination
- **Workflow automation** — "when a project is created / changes status → log activity / send a webhook", with a run history per workflow
- **Role-based access** — only admins can delete projects or create automations
- **Dashboard** — live counts by status, project list with inline status changes, automation health

## How tenant isolation works

1. **The tenant id comes only from the signed session.** `requireSession()` in `src/lib/api.ts` reads `organizationId` from the verified JWT. It is never accepted from the request body, query string or headers.
2. **Every query is scoped.** Reads use `findFirst({ where: { id, organizationId } })` instead of `findUnique({ where: { id } })`. A record owned by another tenant returns **404**, which doesn't even reveal that it exists.
3. **Cross-references are checked.** Creating a project verifies that `clientId` belongs to the caller's organization — otherwise a user could attach work to another tenant's client.
4. **Writes are scoped atomically.** Deletes use `deleteMany({ where: { id, organizationId } })`, so they physically cannot touch another tenant's rows.
5. **Indexes lead with `organizationId`**, so tenant-scoped queries stay fast as data grows.

`src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) only does convenience redirects. Real authorization happens in each route handler and page.

## Project structure

```
prisma/
  schema.prisma          Organization, User, Client, Project, Workflow, WorkflowRun
  seed.ts                Two demo tenants for testing isolation
src/
  proxy.ts               Route protection redirects
  lib/
    prisma.ts            Singleton Prisma client
    session.ts           JWT session create / verify / destroy
    api.ts               requireSession, requireAdmin, Zod body parsing, error mapping
    validations.ts       All Zod schemas
    workflows.ts         Workflow event dispatcher
  app/
    api/auth/            register, login, logout
    api/projects/        list + create, and [id] get / patch / delete
    api/clients/         list + create
    api/workflows/       list + create
    dashboard/page.tsx   Server-rendered tenant dashboard
    login/ register/     Auth pages
  components/            Client-side forms and controls
```

## API

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | Creates org + admin, starts session |
| POST | `/api/auth/login` | — | |
| POST | `/api/auth/logout` | — | |
| GET | `/api/projects?status=&page=&pageSize=` | member | Paginated, tenant-scoped |
| POST | `/api/projects` | member | Fires `PROJECT_CREATED` |
| GET / PATCH | `/api/projects/:id` | member | Status change fires `PROJECT_STATUS_CHANGED` |
| DELETE | `/api/projects/:id` | admin | |
| GET / POST | `/api/clients` | member | Client email unique per tenant |
| GET | `/api/workflows` | member | Includes last 5 runs |
| POST | `/api/workflows` | admin | Webhook URLs must be `https` |

Errors return `{ error, details? }` with `401`, `403`, `404`, `409`, `422` or `500`.

## Running locally

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and SESSION_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open http://localhost:3000 and log in as `admin@acme.test` / `password123`, then as `admin@globex.test` in a private window — each sees only its own clients and projects.

## Deploying

1. Create a free PostgreSQL database on **Neon** or **Supabase** and copy the connection string.
2. Push this repo to GitHub and import it in **Vercel**.
3. Set `DATABASE_URL` and `SESSION_SECRET` (`openssl rand -base64 32`) in Vercel's environment variables.
4. Run `npx prisma migrate deploy` against the production database (locally with the prod URL, or as a build step).

## Ideas for next steps

- Invite teammates to an organization (email invite tokens)
- Postgres Row-Level Security as a second layer of isolation
- Background queue (e.g. Inngest or a cron route) for retrying failed webhooks
- Audit log and activity feed per project
- Tests: an integration test that logs in as tenant A and asserts tenant B's ids return 404
