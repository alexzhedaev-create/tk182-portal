import type { ApprovalAuditEvent } from "@tk182/shared-types";

import { formatRole } from "../lib/auth";
import { formatDateTime } from "../lib/review";

interface SecretariatAuditTrailProps {
  emptyText?: string;
  events: ApprovalAuditEvent[];
  title?: string;
}

function pickTextValue(
  metadata: Record<string, unknown> | null,
  key: string
): string | null {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function formatRelatedObject(event: ApprovalAuditEvent): string {
  switch (event.entityType) {
    case "REVIEW_COMMENT": {
      const sectionRef = pickTextValue(event.metadata, "sectionRef");
      const pointRef = pickTextValue(event.metadata, "pointRef");
      const pageRef = pickTextValue(event.metadata, "pageRef");
      const parts = [sectionRef, pointRef, pageRef ? `стр. ${pageRef}` : null].filter(
        Boolean
      );

      return parts.length > 0 ? `Замечание: ${parts.join(", ")}` : "Замечание участника";
    }
    case "PARTICIPANT_POSITION": {
      const positionLabel = pickTextValue(event.metadata, "positionLabel");

      return positionLabel
        ? `Итоговая позиция: ${positionLabel}`
        : "Итоговая позиция участника";
    }
    case "VERSION_FILE": {
      const originalName = pickTextValue(event.metadata, "originalName");

      return originalName ? `Файл: ${originalName}` : "Файл версии";
    }
    case "DRAFT_STANDARD": {
      const code = pickTextValue(event.metadata, "code");
      const title = pickTextValue(event.metadata, "title");

      if (code && title) {
        return `Проект стандарта: ${code} • ${title}`;
      }

      return title ? `Проект стандарта: ${title}` : "Проект стандарта";
    }
    case "DRAFT_STANDARD_VERSION": {
      const versionLabel = pickTextValue(event.metadata, "versionLabel");
      const fileName = pickTextValue(event.metadata, "fileName");

      if (versionLabel && fileName) {
        return `Версия: ${versionLabel} • ${fileName}`;
      }

      return versionLabel ? `Версия: ${versionLabel}` : "Версия проекта стандарта";
    }
    case "REVIEW_CYCLE": {
      const title = pickTextValue(event.metadata, "title");
      const statusLabel = pickTextValue(event.metadata, "statusLabel");

      if (title && statusLabel) {
        return `Цикл: ${title} • ${statusLabel}`;
      }

      return title ? `Цикл: ${title}` : "Цикл согласования";
    }
    case "REVIEW_ASSIGNMENT": {
      const userDisplayName = pickTextValue(event.metadata, "userDisplayName");
      const organizationName = pickTextValue(event.metadata, "organizationName");

      if (userDisplayName && organizationName) {
        return `Назначение: ${userDisplayName} • ${organizationName}`;
      }

      return userDisplayName
        ? `Назначение: ${userDisplayName}`
        : "Назначение участника";
    }
    case "COMMITTEE_ORGANIZATION": {
      const name = pickTextValue(event.metadata, "name");
      const shortName = pickTextValue(event.metadata, "shortName");

      if (name && shortName) {
        return `Организация: ${name} • ${shortName}`;
      }

      return name ? `Организация: ${name}` : "Организация ТК 182";
    }
    case "COMMITTEE_PERSON": {
      const fullName = pickTextValue(event.metadata, "fullName");
      const jobTitle = pickTextValue(event.metadata, "jobTitle");

      if (fullName && jobTitle) {
        return `Представитель: ${fullName} • ${jobTitle}`;
      }

      return fullName ? `Представитель: ${fullName}` : "Представитель комитета";
    }
    case "COMMITTEE_ROLE_ASSIGNMENT": {
      const personFullName = pickTextValue(event.metadata, "personFullName");
      const roleTitle = pickTextValue(event.metadata, "roleTitle");

      if (personFullName && roleTitle) {
        return `Роль: ${roleTitle} • ${personFullName}`;
      }

      return roleTitle ? `Роль: ${roleTitle}` : "Назначение комитетной роли";
    }
    case "SUBCOMMITTEE": {
      const code = pickTextValue(event.metadata, "code");
      const title = pickTextValue(event.metadata, "title");

      if (code && title) {
        return `Подкомитет: ${code} • ${title}`;
      }

      return title ? `Подкомитет: ${title}` : "Подкомитет";
    }
    default:
      return event.entityId;
  }
}

export function SecretariatAuditTrail({
  emptyText = "История действий по этому циклу пока пуста.",
  events,
  title = "Журнал изменений"
}: SecretariatAuditTrailProps) {
  return (
    <article className="content-card" data-testid="secretariat-audit-panel">
      <h2>{title}</h2>
      <div className="content-stack">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.id}
              className="review-card"
              data-testid={`secretariat-audit-event-${event.id}`}
            >
              <div className="review-card-header">
                <div>
                  <strong>{event.message}</strong>
                  <p className="status-note">{formatRelatedObject(event)}</p>
                </div>
                <span className="pill">{formatDateTime(event.timestamp)}</span>
              </div>
              <div className="pill-row">
                <span className="pill">{event.actorDisplayName}</span>
                <span className="pill">{formatRole(event.actorRole)}</span>
              </div>
            </div>
          ))
        ) : (
          <p>{emptyText}</p>
        )}
      </div>
    </article>
  );
}
