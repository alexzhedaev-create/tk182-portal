# TK182 Portal

TK182 Portal is the local MVP monorepo for the official Technical Committee 182 portal.

This repository currently includes:
- `apps/web`: Next.js + TypeScript web app with a public site plus protected participant and secretariat workspaces
- `apps/api`: NestJS + TypeScript API with PostgreSQL-backed auth, sessions, organizations, users, and documents
- `packages/shared-types`: shared DTOs and cross-app types
- `infra/docker-compose.yml`: local PostgreSQL plus containerized app services

This is still a local MVP. The core persistence and local authentication slice is now implemented, while broader business modules remain intentionally minimal.

## Stack

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- Package manager: pnpm
- Local infrastructure: Docker Compose

## Requirements

- Node.js 20+
- pnpm 10+
- Docker with Compose

## Exact local setup

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Install workspace dependencies:

```bash
pnpm install
```

3. Start PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

4. Run migrations and seed the local database:

```bash
pnpm db:setup
```

5. Start the web app and API:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:api
pnpm dev:web
```

6. Open the local portal:

```text
Login: http://127.0.0.1:3000/login
Participant workspace: http://127.0.0.1:3000/participant
Secretariat workspace: http://127.0.0.1:3000/secretariat
API health: http://127.0.0.1:3001/health
API session: http://127.0.0.1:3001/auth/session
```

Use `127.0.0.1` consistently in local development so session behavior stays predictable.

## Seed credentials

- Admin: `admin@tk182.local` / `AdminPass123!`
- Secretariat: `secretariat@tk182.local` / `SecretariatPass123!`
- Participant: `participant@tk182.local` / `ParticipantPass123!`

## What works now

- PostgreSQL migrations and a repeatable seed script
- Persisted models for `Organization`, `User`, `Session`, and `Document`
- Local password-based login with hashed passwords
- httpOnly cookie-backed sessions with logout and live `/auth/session`
- Role-aware API guards for protected routes
- Protected `/participant` and `/secretariat` routes in the web app
- Session persistence across refresh in the web app
- Seeded user identity display and seeded document loading in both private workspaces

## Current local commands

```bash
pnpm db:migrate
pnpm db:seed
pnpm build
pnpm typecheck
pnpm check
```

## Still intentionally minimal

- Public site content modules remain mostly placeholder content
- Approval, notifications, audit, news, meetings, standards, and pages are still scaffold-level modules
- There is no cloud integration or external auth provider in this MVP
