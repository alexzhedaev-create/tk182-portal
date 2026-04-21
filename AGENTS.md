# TK182 Portal

## Product
Official web portal for Technical Committee 182.

The portal has three parts:
- public website
- participant workspace for reviewing draft standards
- secretariat workspace for managing review cycles

## Stack
- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- Package manager: pnpm
- Local infrastructure: Docker Compose

## Repository layout
- apps/web
- apps/api
- packages/shared-types
- docs
- infra

## Engineering rules
- For non-trivial tasks, plan first before editing code.
- Keep the public website and the private approval workflow clearly separated.
- Do not add cloud integrations in MVP.
- Do not add external auth providers in MVP.
- Use environment variables and provide `.env.example`.
- Prefer explicit types and modular architecture.
- Create minimal but real runnable scaffolding, not mock-only placeholders.
- Before finishing any coding task, run the relevant checks and summarize the result.

## MVP modules
- auth
- users
- organizations
- pages
- news
- documents
- standards
- meetings
- approval
- notifications
- audit

## Done when
- Docker Compose starts PostgreSQL and app services
- web app runs locally
- api app runs locally
- health endpoint works
- database connection works
- base auth scaffold exists
- core modules are scaffolded
- README contains local launch steps
