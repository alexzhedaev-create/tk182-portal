import type {
  ParticipantPositionValue,
  ReviewCommentStatus,
  ReviewCycleStatus,
  ReviewFileVisibility
} from "@tk182/shared-types";

export function formatReviewCycleStatus(status: ReviewCycleStatus): string {
  switch (status) {
    case "draft":
      return "Черновик";
    case "open":
      return "Открыт";
    case "closed":
      return "Закрыт";
    default:
      return status;
  }
}

export function formatReviewCommentStatus(status: ReviewCommentStatus): string {
  switch (status) {
    case "RECEIVED":
      return "Получено";
    case "IN_REVIEW":
      return "На рассмотрении";
    case "ACCEPTED":
      return "Принято";
    case "PARTIALLY_ACCEPTED":
      return "Принято частично";
    case "REJECTED":
      return "Отклонено";
    case "NEEDS_CLARIFICATION":
      return "Нужно уточнение";
    default:
      return status;
  }
}

export function formatParticipantPosition(position: ParticipantPositionValue): string {
  switch (position) {
    case "AGREED":
      return "Согласовано";
    case "AGREED_WITH_COMMENTS":
      return "Согласовано с замечаниями";
    case "NOT_AGREED":
      return "Не согласовано";
    default:
      return position;
  }
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatReviewFileVisibility(visibility: ReviewFileVisibility): string {
  switch (visibility) {
    case "ASSIGNED_PARTICIPANTS":
      return "Доступно участникам";
    case "SECRETARIAT_ONLY":
      return "Только секретариат";
    default:
      return visibility;
  }
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} Б`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} КБ`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}
