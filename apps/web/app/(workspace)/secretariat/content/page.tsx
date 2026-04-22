import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../../components/access-denied-card";
import { SecretariatApprovedStandardsPanel } from "../../../../components/secretariat-approved-standards-panel";
import { SecretariatAuditTrail } from "../../../../components/secretariat-audit-trail";
import { SecretariatContentMigrationChecklist } from "../../../../components/secretariat-content-migration-checklist";
import { SecretariatMeetingsPanel } from "../../../../components/secretariat-meetings-panel";
import { SecretariatNewsPanel } from "../../../../components/secretariat-news-panel";
import { SecretariatPublicDocumentsPanel } from "../../../../components/secretariat-public-documents-panel";
import { WorkspaceSessionCard } from "../../../../components/workspace-session-card";
import {
  getBackofficeApprovedStandards,
  getBackofficeMeetingRecords,
  getBackofficeNewsItems,
  getBackofficePublicDocuments,
  getCommitteeSubcommittees,
  getContentAuditEvents,
  getServerSession
} from "../../../../lib/api";
import { canAccessWorkspace } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function SecretariatContentPage() {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/secretariat/content");
  }

  if (!canAccessWorkspace(session.user.role, "secretariat")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="secretariat" user={session.user} />
      </div>
    );
  }

  const [newsItems, documents, meetings, approvedStandards, subcommittees, auditEvents] =
    await Promise.all([
      getBackofficeNewsItems(),
      getBackofficePublicDocuments(),
      getBackofficeMeetingRecords(),
      getBackofficeApprovedStandards(),
      getCommitteeSubcommittees(),
      getContentAuditEvents()
    ]);
  const migrationChecklistItems = [
    ...newsItems.map((item) => ({ title: item.title, migration: item.migration })),
    ...documents.map((item) => ({ title: item.title, migration: item.migration })),
    ...meetings.map((item) => ({ title: item.title, migration: item.migration })),
    ...approvedStandards.map((item) => ({
      title: `${item.code} — ${item.title}`,
      migration: item.migration
    }))
  ];

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Секретариат ТК 182</div>
          <h1 className="page-title">Контент портала</h1>
          <p className="page-intro">
            Здесь секретариат и администратор готовят публичное наполнение нового портала
            для ручной миграции материалов со старого сайта ТК 182.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Новости: {newsItems.length}</span>
          <span className="pill">Документы: {documents.length}</span>
          <span className="pill">Заседания: {meetings.length}</span>
          <span className="pill">Утвержденные стандарты: {approvedStandards.length}</span>
          <Link className="pill" href="/secretariat">
            Вернуться к циклам
          </Link>
          <Link className="pill" href="/news">
            Открыть публичные разделы
          </Link>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />

        <article className="content-card">
          <h2>Что поддерживается</h2>
          <ul>
            <li>Новости и публичные объявления комитета.</li>
            <li>Основные документы, отчеты и планы работ.</li>
            <li>Протоколы заседаний и повестки.</li>
            <li>Утвержденные стандарты и программа разработки национальных стандартов.</li>
            <li>Контроль ручного переноса со старого сайта по источнику, статусу и комментарию.</li>
          </ul>
          <p className="status-note">
            Все записи создаются как реальные persisted-сущности и могут быть
            опубликованы или сняты с публикации, а также отмечены как перенесенные и проверенные.
          </p>
        </article>
      </section>

      <section className="content-stack">
        <SecretariatContentMigrationChecklist items={migrationChecklistItems} />
        <SecretariatNewsPanel newsItems={newsItems} />
        <SecretariatPublicDocumentsPanel documents={documents} />
        <SecretariatMeetingsPanel meetings={meetings} />
        <SecretariatApprovedStandardsPanel
          standards={approvedStandards}
          subcommittees={subcommittees}
        />
        <SecretariatAuditTrail
          emptyText="История изменений контента пока пуста."
          events={auditEvents}
          title="Журнал изменений контента"
        />
      </section>
    </div>
  );
}
