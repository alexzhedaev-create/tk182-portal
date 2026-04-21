# TK182 Portal

TK182 Portal is the local-first MVP monorepo for the official Technical Committee 182 portal.

The scaffold currently includes:
- `apps/web`: Next.js + TypeScript scaffold with a public website plus separate participant and secretariat placeholder surfaces
- `apps/api`: NestJS + TypeScript API foundation with health, auth scaffold, and module inventory endpoints
- `packages/shared-types`: shared DTO and type placeholders
- `infra/docker-compose.yml`: local PostgreSQL plus containerized web and api services

## Requirements

- Node.js 20+
- pnpm 10+
- Docker with Compose

## Local setup

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

4. Start the API in one terminal:

```bash
pnpm dev:api
```

5. Start the web app in a second terminal:

```bash
pnpm dev:web
```

6. Verify the API endpoints:

```bash
curl http://localhost:3001/
curl http://localhost:3001/health
```

7. Open the portal surfaces:

```text
Public website: http://localhost:3000
Participant workspace: http://localhost:3000/participant
Secretariat workspace: http://localhost:3000/secretariat
```

## Full containerized stack

```bash
pnpm compose:up
```

Stop it with:

```bash
pnpm compose:down
```

## Checks

```bash
pnpm build
pnpm typecheck
pnpm check
```

## MVP status

Working now:
- Next.js scaffold with separate public, participant, and secretariat route surfaces
- NestJS API scaffold with `/`, `/health`, `/auth`, and stubbed MVP module endpoints
- PostgreSQL wiring for local development and degraded health reporting when the database is unavailable
- shared types for future cross-app contracts

Local defaults bind to `127.0.0.1`, while Docker Compose overrides both app hosts to `0.0.0.0`.

Still stubbed:
- credential verification, password hashing, and persisted sessions
- database entities and migrations
- participant review workflow data and protected document access
- secretariat review-cycle management and operational tooling
- notifications, audit persistence, and document business logic
