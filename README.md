# TK182 Portal

TK182 Portal is the local MVP monorepo for the official Technical Committee 182 portal.

The repository now includes a real first review workflow on top of the existing auth and PostgreSQL foundation:
- public website in Russian
- participant workspace for reviewing assigned draft standards
- secretariat workspace for tracking cycle progress, participant responses, comment statuses, and version files

The MVP remains local-only. There are no cloud integrations, no external auth providers, and no multilingual infrastructure yet. User-facing UI is Russian only in this phase.

Draft standard files are also local-only in this MVP:
- file metadata is stored in PostgreSQL
- uploaded binaries are stored on the local filesystem
- there is no cloud or S3 integration

## Stack

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- Package manager: pnpm
- Local infrastructure: Docker Compose

## Repository layout

- `apps/web`: Next.js web app
- `apps/api`: NestJS API
- `packages/shared-types`: shared DTOs and cross-app contracts
- `docs`: project documentation
- `infra`: local infrastructure, including Docker Compose

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

`pnpm db:setup` also recreates demo upload files in the local storage directory.

5. Start the API and web app:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:api
pnpm dev:web
```

Production-like startup after a build:

```bash
pnpm build
pnpm --filter @tk182/api start
pnpm --filter @tk182/web start
```

6. Open the local application:

```text
Public site: http://127.0.0.1:3000
Login page: http://127.0.0.1:3000/login
Participant workspace: http://127.0.0.1:3000/participant
Secretariat workspace: http://127.0.0.1:3000/secretariat
API health: http://127.0.0.1:3001/health
Auth session: http://127.0.0.1:3001/auth/session
```

Use `127.0.0.1` consistently in local development so cookie behavior stays predictable.

## Demo accounts

- Admin: `admin@tk182.local` / `AdminPass123!`
- Secretariat: `secretariat@tk182.local` / `SecretariatPass123!`
- Participant: `participant@tk182.local` / `ParticipantPass123!`
- Participant 2: `participant2@tk182.local` / `Participant2Pass123!`

## Implemented review workflow

The current seed demonstrates the first real draft standard review slice:

- 2 draft standards with Russian titles and descriptions
- multiple draft standard versions
- 1 active review cycle
- 1 closed review cycle
- participant assignments for multiple organizations
- participant comments in Russian
- participant final positions in Russian
- secretariat review statuses and responses
- persistent audit trail for core review and file actions
- local version-file storage with DB metadata and role-based download access

Core persisted entities now include:

- `Organization`
- `User`
- `Session`
- `Document`
- `DraftStandard`
- `DraftStandardVersion`
- `ReviewCycle`
- `ReviewAssignment`
- `ReviewComment`
- `ParticipantPosition`
- `DraftStandardVersionFile`
- `AuditEvent`

## Local file storage

The MVP file layer uses the local filesystem only.

- storage root: `storage/uploads` by default
- environment variable: `FILE_STORAGE_DIR`
- max file size: `FILE_STORAGE_MAX_BYTES`
- allowed extensions: `FILE_STORAGE_ALLOWED_EXTENSIONS`
- uploaded files are ignored by git and remain local to your machine

The seed script recreates several demo text attachments for the active and archived review cycles. Re-running `pnpm db:setup` resets both the database content and the local uploaded demo files.

## Manual testing flows

### Participant flow

1. Open `http://127.0.0.1:3000/login`
2. Sign in as `participant@tk182.local`
3. Open `На согласовании`
4. Open the assigned draft standard card
5. Verify the current version, deadline, and section `Файлы версии`
6. Add a new comment
7. Edit or delete a draft comment while the cycle is still open
8. Submit the final position using one of:
   - `Согласовано`
   - `Согласовано с замечаниями`
   - `Не согласовано`
9. Download an available file from `Файлы версии`
10. Refresh the page and verify that the session and submitted position persist

### Secretariat flow

1. Open `http://127.0.0.1:3000/login`
2. Sign in as `secretariat@tk182.local`
3. Open `Циклы согласования`
4. Verify active and archived cycles
5. Open an active cycle
6. Check:
   - total participants
   - responded participants
   - pending participants
7. In `Файлы версии`, upload a new file for the current version
8. Update file description or visibility if needed
9. Download the file and, if needed, delete it
10. Review participant positions
11. Update a comment status to one of:
   - `Получено`
   - `На рассмотрении`
   - `Принято`
   - `Принято частично`
   - `Отклонено`
   - `Нужно уточнение`
12. Add or update the secretariat response text
13. Check `Журнал изменений` on the cycle page to review recorded actions

### File upload and download checks

1. Sign in as `secretariat@tk182.local`
2. Open an active cycle and upload a small `.txt` or `.pdf` file in `Файлы версии`
3. Optionally choose:
   - `Доступно участникам`
   - `Только секретариат`
4. Save the file description
5. Sign in as `participant@tk182.local`
6. Open the assigned draft standard card
7. Verify that only participant-visible files are listed
8. Download an allowed file using `Скачать`

Files marked `Только секретариат` remain unavailable to participant endpoints.

## Automated tests

The MVP now includes integration/e2e coverage for the current core flows:

- auth login, logout, and session restoration
- participant and secretariat access restrictions
- participant assigned review item visibility
- participant comment creation
- participant final position submission
- secretariat review status updates
- secretariat file upload
- participant file visibility
- forbidden participant download of secretariat-only files
- audit trail creation for participant and secretariat review actions
- production-like `next start` checks for the current Russian UI
- browser-level Playwright scenarios for the current Russian UI

Run the full verification suite:

```bash
pnpm test
```

Run the suites separately when needed:

```bash
pnpm test:e2e:api
pnpm test:e2e:web
pnpm test:e2e:browser
```

The full `pnpm test` command performs:

1. `pnpm db:setup`
2. `pnpm build`
3. the e2e test suite

### Playwright browser tests

Install the local Chromium browser once:

```bash
pnpm playwright:install
```

Run the browser suite:

```bash
pnpm test:e2e:browser
```

The Playwright suite covers:

- participant login through the real Russian login form
- participant redirect into `На согласовании`
- participant comment creation through the browser UI
- participant final position submission through the browser UI
- secretariat login through the real Russian login form
- secretariat cycle detail flow
- secretariat comment status update and response editing through the browser UI
- secretariat file upload through the browser UI
- secretariat audit-trail visibility in `Журнал изменений`
- unauthenticated redirects to `/login`
- wrong-role access to the secretariat area for a participant

Browser e2e uses dedicated ports by default:

- web: `127.0.0.1:3200`
- api: `127.0.0.1:3201`

This keeps Playwright isolated from the usual local dev ports.

## GitHub Actions CI

The repository now includes a GitHub Actions workflow that runs on every `push` and `pull_request`.

CI runs:

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e:api`
- `pnpm test:e2e:web`
- `pnpm test:e2e:browser`

CI assumptions:

- GitHub-hosted Ubuntu runners
- Node.js `20.18.1`
- pnpm `10.8.0`
- PostgreSQL `16` as a workflow service on `127.0.0.1:5432`
- the same local-style env values used by the repository for API, web, cookies, and file storage
- Playwright Chromium installed in CI before browser tests
- browser e2e uses dedicated ports `3200/3201`

The closest local equivalents are:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test:e2e:api
pnpm test:e2e:web
pnpm playwright:install
pnpm test:e2e:browser
```

If you want the same sequence in one command locally, run:

```bash
pnpm test
```

### Role behavior

- Unauthenticated users are redirected to `/login`
- `PARTICIPANT` can access the participant workflow only
- `SECRETARIAT` can access the secretariat workflow
- `ADMIN` can access the secretariat workflow
- Wrong-role access shows a clear Russian access-denied page
- Audit history is secretariat-only in the MVP UI and API

## Audit trail

The MVP audit trail covers persistent workflow events for:

- participant comment creation
- participant comment editing
- participant comment deletion
- participant final position submission or update
- secretariat comment status changes
- secretariat response updates
- version file upload
- version file metadata updates
- version file deletion

Audit history is visible in the secretariat cycle detail page under `Журнал изменений` and is also available through secretariat-only API endpoints:

- `GET /audit/review-cycles/:cycleId/events`
- `GET /audit/draft-standards/:draftStandardId/events`

Still intentionally not covered yet:

- full system-wide audit beyond the review workflow
- auth/session lifecycle events
- publication workflow and broader standards lifecycle events

## Useful commands

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:setup
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e:api
pnpm test:e2e:web
pnpm playwright:install
pnpm test:e2e:browser
pnpm check
```

## Current scope and remaining gaps

Implemented now:
- PostgreSQL migrations for auth and review workflow
- repeatable seed data with Russian demo content
- local credential auth with hashed passwords and httpOnly sessions
- participant review endpoints and UI
- secretariat review management endpoints and UI
- local upload/download pipeline for draft standard version files
- persistent audit trail for the current review workflow actions
- automated API and production-like web e2e coverage for the current MVP flows
- Playwright browser coverage for participant, secretariat, and access-control flows
- Russian-only visible UI for current MVP surfaces

Still intentionally minimal:
- public content pages remain mostly informational placeholders
- notifications, pages, news, meetings, and broader standards lifecycle remain MVP-level scaffolds
- audit currently covers only the core review/file actions described above
