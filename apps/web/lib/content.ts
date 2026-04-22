import type {
  ContentPublicationStatus,
  MeetingRecordCategory,
  PublicDocumentCategory
} from "@tk182/shared-types";

export function formatPublicationStatus(status: ContentPublicationStatus): string {
  switch (status) {
    case "published":
      return "Опубликовано";
    case "draft":
      return "Черновик";
    default:
      return status;
  }
}

export function formatPublicDocumentCategory(category: PublicDocumentCategory): string {
  switch (category) {
    case "MAIN_DOCUMENTS":
      return "Основные документы";
    case "WORK_REPORTS":
      return "Отчеты о работе ТК 182";
    case "WORK_PLANS":
      return "Планы и перспективные программы работ ТК 182";
    case "NATIONAL_STANDARDS_PROGRAM":
      return "Программа разработки национальных стандартов";
    default:
      return category;
  }
}

export function formatMeetingRecordCategory(category: MeetingRecordCategory): string {
  switch (category) {
    case "MEETING_AGENDA":
      return "Уведомления и повестки заседаний";
    case "MEETING_MINUTES":
      return "Протоколы заседаний";
    default:
      return category;
  }
}
