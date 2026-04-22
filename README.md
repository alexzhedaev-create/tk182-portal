# TK182 Portal

TK182 Portal is the local MVP monorepo for the official Technical Committee 182 portal.

The repository now includes a real first review workflow on top of the existing auth and PostgreSQL foundation:
- public website in Russian with the seeded TK 182 committee structure
- public content modules for news, documents, meetings, and approved standards
- participant workspace for reviewing assigned draft standards
- secretariat workspace for creating projects, versions, review cycles, participant assignments, tracking cycle progress, and managing committee structure data
- secretariat publishing backoffice for migrating public content from the old TK 182 site
- participant notification center for important workflow events

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
Committee structure: http://127.0.0.1:3000/about
News: http://127.0.0.1:3000/news
Documents: http://127.0.0.1:3000/documents
Meetings: http://127.0.0.1:3000/meetings
Organizations: http://127.0.0.1:3000/organizations
Public standards: http://127.0.0.1:3000/standards
Login page: http://127.0.0.1:3000/login
Participant workspace: http://127.0.0.1:3000/participant
Secretariat workspace: http://127.0.0.1:3000/secretariat
Secretariat content backoffice: http://127.0.0.1:3000/secretariat/content
API health: http://127.0.0.1:3001/health
Auth session: http://127.0.0.1:3001/auth/session
```

Use `127.0.0.1` consistently in local development so cookie behavior stays predictable.

## Demo accounts

- Admin: `admin@tk182.local` / `AdminPass123!`
- Secretariat: `secretariat@tk182.local` / `SecretariatPass123!`
- Participant: `participant@tk182.local` / `ParticipantPass123!`
- Participant 2: `participant2@tk182.local` / `Participant2Pass123!`

## Implemented workflow and structure

The public portal and workflow now understand the real TK 182 committee structure.

- public pages show `Руководство ТК 182`, `Секретариат`, `Подкомитеты`, and `Организации`
- the seed contains the named co-chairs, deputy co-chairs, secretariat representatives, and subcommittees `ПК 1` through `ПК 7`
- draft standards are linked to a responsible subcommittee
- the responsible subcommittee is shown on the public standards catalogue, participant draft-standard cards, secretariat cycle/project pages, and secretariat backoffice forms
- secretariat and admin users can edit organizations, committee representatives, role assignments, and subcommittees through the backoffice instead of changing seed-only data

In the current MVP, secretariat users choose the responsible subcommittee directly on the draft-standard form. Once a cycle is created from that draft standard, the same link is visible to participants and secretariat users in the workflow UI.

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
- persistent in-portal notifications for participant-facing workflow events
- local version-file storage with DB metadata and role-based download access
- secretariat backoffice flow for creating draft standards, versions, cycles, and assignments
- committee structure backoffice for updating leadership, secretariat assignments, organizations, and subcommittees
- secretariat publishing backoffice for public content modules and legacy-site categories
- public TK 182 structure with named leadership, secretariat, subcommittees, and organizations
- public pages for `Новости`, `Документы`, `Заседания`, `Проекты стандартов`, `Программа разработки национальных стандартов`, and `Утвержденные стандарты`

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
- `Notification`
- `NewsItem`
- `PublicDocument`
- `MeetingRecord`
- `ApprovedStandard`

## Public content modules

The portal now supports real persisted public content instead of placeholder pages.

- `Новости`
- `Основные документы`
- `Отчеты о работе ТК 182`
- `Планы и перспективные программы работ ТК 182`
- `Программа разработки национальных стандартов`
- `Протоколы заседаний`
- `Уведомления/повестки заседаний`
- `Утвержденные стандарты`

Public pages are now backed by PostgreSQL records and optional local file attachments:

- `/news`
- `/documents`
- `/meetings`
- `/standards`

Manual migration from the old `viam.ru/tk182` site is intentionally supported through secretariat backoffice rather than scraping:

- create or update public records in `http://127.0.0.1:3000/secretariat/content`
- upload the corresponding local attachment file where needed
- choose the correct category/section used by the old site
- fill in `Источник на старом сайте`
- track `Статус переноса` as `Не перенесено`, `Перенесено`, or `Проверено`
- add `Комментарий по переносу` when the record still needs verification
- set the publication date
- publish the record to make it visible on the public site
- use `Чек-лист переноса контента` to see grouped counts by old site sections and unfinished items

This keeps the target structure ready for staged migration while avoiding automatic import complexity in the MVP.

The portal now distinguishes between two migration layers:

- `Реестр материалов старого сайта`: the full inventory of legacy materials, including items that do not yet exist as portal content entries
- portal content entries: the actual persisted `Новости`, `Документы`, `Заседания`, and `Утвержденные стандарты` shown on public pages

Recommended end-to-end migration workflow for secretariat users:

1. Add a material to `Реестр материалов старого сайта`
2. Fill in `Источник на старом сайте`, section, optional date, and migration note
3. Use `Создать новость`, `Создать документ`, `Создать запись заседания`, or `Создать утвержденный стандарт` directly from the inventory row
4. The portal draft is created automatically with copied title, date, source URL, legacy section, and migration note
5. The inventory record is linked to the new portal entry and moves to `Создано в портале`
6. Complete metadata in the regular portal backoffice form and upload the local file if needed
7. Publish the portal entry when it is ready for the public site
8. Verify the rendered public page and downloadable file
9. Mark both the portal content entry and the inventory record as `Проверено`

This makes the full migration scope traceable even before every legacy item has a destination record in the new portal.

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
10. Вернитесь в `На согласовании` и проверьте блок `Уведомления`
11. При необходимости отметьте уведомление как прочитанное или нажмите `Прочитать все`
12. Refresh the page and verify that the session and submitted position persist

### Secretariat flow

1. Open `http://127.0.0.1:3000/login`
2. Sign in as `secretariat@tk182.local`
3. Open `Циклы согласования`
4. Verify active and archived cycles
5. Перейдите в `Проекты стандартов`
6. При необходимости создайте:
   - новый проект стандарта
   - новую версию
   - новый цикл согласования
7. Откройте созданный или существующий цикл
8. Назначьте участника на цикл
9. Откройте цикл для участников кнопкой `Открыть цикл`
10. Check:
   - total participants
   - responded participants
   - pending participants
11. In `Файлы версии`, upload a new file for the current version
12. Update file description or visibility if needed
13. Download the file and, if needed, delete it
14. Review participant positions
15. Update a comment status to one of:
   - `Получено`
   - `На рассмотрении`
   - `Принято`
   - `Принято частично`
   - `Отклонено`
   - `Нужно уточнение`
16. Add or update the secretariat response text
17. Check `Журнал изменений` on the cycle page to review recorded actions

### Public content backoffice

1. Sign in as `secretariat@tk182.local` or `admin@tk182.local`
2. Open `http://127.0.0.1:3000/secretariat/content`
3. In `Новости`, create or update a public news item and publish it
4. In `Публичные документы`, create records for:
   - `Основные документы`
   - `Отчеты о работе ТК 182`
   - `Планы и перспективные программы работ ТК 182`
   - `Программа разработки национальных стандартов`
5. Upload the related local file if the section requires an attachment
6. For each migrated record, fill in:
   - `Источник на старом сайте`
   - `Статус переноса`
   - `Комментарий по переносу`
7. Use `Чек-лист переноса контента` and the per-section `Фильтр по статусу переноса` to see what is still not transferred or not yet verified
8. In `Заседания`, create and publish:
   - `Уведомления и повестки заседаний`
   - `Протоколы заседаний`
9. In `Утвержденные стандарты`, create the public standard card, choose the responsible subcommittee, and upload the file if needed
10. Open `/news`, `/documents`, `/meetings`, and `/standards` to verify public visibility
11. Check `Журнал изменений контента` to review create, update, publish, and unpublish actions

Recommended manual migration workflow from the old TK 182 site:

1. Inventory the old material and decide which public section it belongs to.
2. Upload the file attachment if the legacy page had a downloadable file.
3. Create the target record in `Контент портала`.
4. Set `Источник на старом сайте` to the exact legacy URL.
5. Save the record with `Статус переноса = Не перенесено` or `Перенесено`.
6. Review the rendered public page and downloaded file in the new portal.
7. When the migrated card and file are verified, switch `Статус переноса` to `Проверено`.

Current MVP constraints for public content:

- create/update/publish/unpublish is supported
- delete/archive is intentionally out of scope for now
- migration is manual through backoffice forms; no automatic scraping/import is included yet
- migration tracking is stored directly on public content records via legacy URL, old-site section, migration status, and migration note

### Secretariat backoffice flow

1. Sign in as `secretariat@tk182.local` or `admin@tk182.local`
2. Open `http://127.0.0.1:3000/secretariat/projects`
3. In `Новый проект стандарта`, create a draft standard card
4. Выберите ответственный подкомитет в поле `Ответственный подкомитет`
5. Open the created project
6. In `Новая версия`, add the first version metadata
7. In `Новый цикл согласования`, create a cycle and attach the version
8. Open the created cycle page
9. In `Назначения участников`, choose a seeded participant and save the assignment
10. In `Параметры цикла`, click `Открыть цикл`
11. Sign in as the participant and confirm that the new active cycle is now visible in `На согласовании`

New cycles created in the backoffice are connected to the existing participant workflow:

- draft cycle + assignment does not yet expose the cycle to participants
- once the cycle is opened, assigned participants see it in `На согласовании`
- opening a cycle also creates participant notifications for the assignment
- the participant sees the same responsible subcommittee that was selected by secretariat for the draft standard

### Committee structure backoffice

1. Sign in as `secretariat@tk182.local` or `admin@tk182.local`
2. Open `http://127.0.0.1:3000/secretariat/committee`
3. In `Организации`, create or update the public organization cards used by TK 182 pages
4. In `Руководство и секретариат: представители`, create or update committee people and link them to organizations
5. In `Руководство ТК и секретариат`, assign committee roles such as `Сопредседатель`, `Заместитель сопредседателя`, `Ответственный секретарь`
6. In `Подкомитеты`, create or update subcommittees and choose their host organization
7. Open public pages such as `/about` and `/organizations` to verify that the edited structure is reflected immediately
8. Check `Журнал изменений структуры` to review recorded backoffice actions

Current MVP constraints for committee structure management:

- committee roles themselves remain seeded and are not edited through the UI
- create/update is supported for organizations, people, role assignments, and subcommittees
- delete/archive is intentionally out of scope for now to keep public structure changes safe

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
- participant notification creation and read/unread state updates
- secretariat backoffice creation of draft standards, versions, cycles, assignments, and cycle activation
- seeded TK 182 leadership, secretariat, subcommittee, and standard-to-subcommittee API coverage
- committee structure backoffice CRUD, audit creation, and public-structure reflection
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
- participant notification block visibility on the real Russian workspace page
- participant comment creation through the browser UI
- participant final position submission through the browser UI
- secretariat login through the real Russian login form
- secretariat cycle detail flow
- secretariat comment status update and response editing through the browser UI
- secretariat file upload through the browser UI
- secretariat audit-trail visibility in `Журнал изменений`
- secretariat backoffice creation of a new project, version, cycle, assignment, and participant visibility
- secretariat committee-structure management through the real Russian UI
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

## Notifications

The MVP notification center is participant-focused and lives inside the participant workspace.

Current notification events:

- assignment to an active review cycle
- comment status changed by secretariat
- secretariat response added or updated on a participant comment
- participant final position submitted or updated
- participant-visible file uploaded to the current version

Available API endpoints:

- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/:notificationId/read`
- `POST /notifications/read-all`

What is intentionally out of scope for now:

- email, SMS, push, or external delivery channels
- a separate secretariat notification center in the web UI
- notifications for every audit event or every administrative action
- automatic notifications for opening new cycles or publishing new versions outside the currently implemented workflow actions

## Audit trail

The MVP audit trail covers persistent workflow events for:

- draft standard creation and metadata updates
- draft standard version creation
- review cycle creation, metadata updates, opening, and closing
- participant assignment to a cycle
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
- `GET /audit/committee/events`
- `GET /audit/content/events`

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
- persisted TK 182 committee structure with leadership, secretariat, subcommittees, and organization links
- participant review endpoints and UI
- secretariat review management endpoints and UI
- secretariat backoffice endpoints and UI for projects, versions, cycles, and assignments
- secretariat backoffice endpoints and UI for organizations, committee representatives, role assignments, and subcommittees
- secretariat publishing backoffice endpoints and UI for news, public documents, meetings, and approved standards
- manual migration tracking for public content with legacy source URL, old-site section, migration status, migration note, and checklist summaries
- responsible subcommittee selection in secretariat backoffice and visibility across public and private flows
- local upload/download pipeline for draft standard version files
- persisted public-content modules for the legacy TK 182 site sections
- persistent audit trail for the current review workflow actions
- persistent participant notifications with unread/read flow inside the portal
- automated API and production-like web e2e coverage for the current MVP flows
- Playwright browser coverage for participant, secretariat, access-control, and content-publishing flows
- Russian-only visible UI for current MVP surfaces

Still intentionally minimal:
- delete/archive flows for committee structure and public content are still out of scope
- audit currently covers review, file, committee, and public-content actions, but not every future admin/publication flow
- notifications currently cover only the participant-facing workflow events described above
