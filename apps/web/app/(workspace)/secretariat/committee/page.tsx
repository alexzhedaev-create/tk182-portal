import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../../components/access-denied-card";
import { SecretariatAuditTrail } from "../../../../components/secretariat-audit-trail";
import { SecretariatCommitteeOrganizationsPanel } from "../../../../components/secretariat-committee-organizations-panel";
import { SecretariatCommitteePeoplePanel } from "../../../../components/secretariat-committee-people-panel";
import { SecretariatCommitteeRoleAssignmentsPanel } from "../../../../components/secretariat-committee-role-assignments-panel";
import { SecretariatCommitteeSubcommitteesPanel } from "../../../../components/secretariat-committee-subcommittees-panel";
import { WorkspaceSessionCard } from "../../../../components/workspace-session-card";
import {
  getCommitteeAuditEvents,
  getCommitteeBackofficeData,
  getServerSession
} from "../../../../lib/api";
import { canAccessWorkspace } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function SecretariatCommitteePage() {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/secretariat/committee");
  }

  if (!canAccessWorkspace(session.user.role, "secretariat")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="secretariat" user={session.user} />
      </div>
    );
  }

  const [backoffice, auditEvents] = await Promise.all([
    getCommitteeBackofficeData(),
    getCommitteeAuditEvents()
  ]);

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Секретариат ТК 182</div>
          <h1 className="page-title">Структура ТК 182</h1>
          <p className="page-intro">
            Здесь секретариат поддерживает актуальные данные по руководству,
            секретариату, подкомитетам и организациям. Публичные страницы
            обновляются на основе этих записей.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Организаций: {backoffice.organizations.length}</span>
          <span className="pill">Представителей: {backoffice.people.length}</span>
          <span className="pill">Подкомитетов: {backoffice.subcommittees.length}</span>
          <span className="pill">Назначений ролей: {backoffice.roleAssignments.length}</span>
          <Link className="pill" href="/secretariat">
            Вернуться к циклам
          </Link>
          <Link className="pill" href="/about">
            Открыть публичную структуру
          </Link>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />

        <article className="content-card">
          <h2>Что редактируется</h2>
          <ul>
            <li>Руководство ТК и роли секретариата через назначения ролей.</li>
            <li>Карточки представителей и их привязка к организациям.</li>
            <li>Подкомитеты и базовые организации.</li>
            <li>Организации, отображаемые на публичных страницах ТК 182.</li>
          </ul>
          <p className="status-note">
            В MVP доступно создание и обновление записей. Удаление и архивирование
            не включены.
          </p>
          <div className="pill-row">
            <span className="pill">
              Руководство: {backoffice.structure.leadership.length}
            </span>
            <span className="pill">
              Заместители: {backoffice.structure.deputyCoChairs.length}
            </span>
            <span className="pill">
              Секретариат: {backoffice.structure.secretariat.length}
            </span>
          </div>
        </article>
      </section>

      <section className="content-stack">
        <SecretariatCommitteeRoleAssignmentsPanel
          assignments={backoffice.roleAssignments}
          people={backoffice.people}
          roles={backoffice.roles}
        />
        <SecretariatCommitteePeoplePanel
          organizations={backoffice.organizations}
          people={backoffice.people}
        />

        <section className="info-grid">
          <SecretariatCommitteeOrganizationsPanel
            organizations={backoffice.organizations}
          />
          <SecretariatCommitteeSubcommitteesPanel
            organizations={backoffice.organizations}
            subcommittees={backoffice.subcommittees}
          />
        </section>

        <SecretariatAuditTrail
          emptyText="История изменений структуры ТК 182 пока пуста."
          events={auditEvents}
          title="Журнал изменений структуры"
        />
      </section>
    </div>
  );
}
