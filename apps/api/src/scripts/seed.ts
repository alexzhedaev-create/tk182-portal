import "../common/config/load-env";

import { rm, writeFile } from "node:fs/promises";

import type { AuthRole, ParticipantPositionValue, ReviewCommentStatus } from "@tk182/shared-types";

import { getApplicationConfig } from "../common/config/environment";
import { createDatabasePool } from "../common/database/database.pool";
import { runMigrations } from "../common/database/migration-runner";
import {
  ensureStorageRootDirectory,
  getFileExtension,
  resolveStoredFilePath
} from "../common/storage/local-file-storage";
import { hashPassword } from "../modules/auth/auth.crypto";

interface SeedOrganization {
  countryCode: string;
  id: string;
  name: string;
  shortName: string;
}

interface SeedUser {
  displayName: string;
  email: string;
  id: string;
  organizationId: string;
  password: string;
  role: AuthRole;
}

interface SeedDocument {
  category: string;
  createdByUserId: string;
  id: string;
  organizationId: string;
  publishedAt: string;
  summary: string;
  title: string;
  visibility: "public" | "participant" | "secretariat";
}

interface SeedDraftStandard {
  code: string;
  id: string;
  responsibleSubcommitteeId: string;
  stage: string;
  summary: string;
  title: string;
}

interface SeedCommitteeRole {
  category: "leadership" | "deputy" | "secretariat";
  code: string;
  id: string;
  sortOrder: number;
  title: string;
}

interface SeedCommitteePerson {
  fullName: string;
  id: string;
  jobTitle: string;
  organizationId: string;
}

interface SeedCommitteePersonRole {
  committeePersonId: string;
  committeeRoleId: string;
  id: string;
  sortOrder: number;
}

interface SeedSubcommittee {
  code: string;
  hostOrganizationId: string;
  id: string;
  title: string;
}

interface SeedDraftStandardVersion {
  draftStandardId: string;
  fileName: string;
  fileNote: string;
  id: string;
  publishedAt: string;
  revisionSummary: string;
  versionLabel: string;
}

interface SeedReviewCycle {
  createdByUserId: string;
  deadlineAt: string;
  description: string;
  draftStandardId: string;
  draftStandardVersionId: string;
  id: string;
  opensAt: string;
  status: "draft" | "open" | "closed";
  title: string;
  closedAt?: string | null;
}

interface SeedReviewAssignment {
  id: string;
  organizationId: string;
  respondedAt?: string | null;
  reviewCycleId: string;
  userId: string;
}

interface SeedReviewComment {
  authorUserId: string;
  createdAt: string;
  draftStandardId: string;
  draftStandardVersionId: string;
  id: string;
  organizationId: string;
  pageRef?: string | null;
  pointRef?: string | null;
  proposedText: string;
  rationale: string;
  remark: string;
  reviewAssignmentId: string;
  reviewCycleId: string;
  reviewStatus: ReviewCommentStatus;
  secretariatResponse?: string | null;
  sectionRef: string;
  updatedAt: string;
}

interface SeedParticipantPosition {
  id: string;
  note?: string | null;
  organizationId: string;
  position: ParticipantPositionValue;
  reviewAssignmentId: string;
  reviewCycleId: string;
  submittedAt: string;
  submittedByUserId: string;
}

interface SeedVersionFile {
  content: string;
  description?: string | null;
  id: string;
  mimeType: string;
  originalName: string;
  uploadedAt: string;
  uploadedByUserId: string;
  versionId: string;
  visibility: "ASSIGNED_PARTICIPANTS" | "SECRETARIAT_ONLY";
}

interface SeedNotification {
  createdAt: string;
  id: string;
  message: string;
  readAt?: string | null;
  recipientUserId: string;
  relatedCommentId?: string | null;
  relatedCycleId?: string | null;
  relatedDraftStandardId?: string | null;
  relatedFileId?: string | null;
  targetRoute?: string | null;
  title: string;
  type:
    | "ASSIGNED_TO_ACTIVE_CYCLE"
    | "COMMENT_STATUS_CHANGED"
    | "SECRETARIAT_RESPONSE_UPDATED"
    | "FINAL_POSITION_SUBMITTED"
    | "FINAL_POSITION_UPDATED"
    | "VERSION_FILE_UPLOADED";
}

interface SeedContentAttachment {
  content: string;
  description?: string | null;
  mimeType: string;
  originalName: string;
  uploadedAt: string;
  uploadedByUserId: string;
}

interface SeedNewsItem {
  body: string;
  createdByUserId: string;
  excerpt: string;
  id: string;
  publicationDate: string;
  publishedAt: string;
  status: "draft" | "published";
  title: string;
}

interface SeedPublicDocument {
  attachment?: SeedContentAttachment | null;
  category:
    | "MAIN_DOCUMENTS"
    | "WORK_REPORTS"
    | "WORK_PLANS"
    | "NATIONAL_STANDARDS_PROGRAM";
  createdByUserId: string;
  id: string;
  publicationDate: string;
  publishedAt: string;
  status: "draft" | "published";
  summary: string;
  title: string;
}

interface SeedMeetingRecord {
  attachment?: SeedContentAttachment | null;
  body: string;
  category: "MEETING_MINUTES" | "MEETING_AGENDA";
  createdByUserId: string;
  id: string;
  location?: string | null;
  meetingDate: string;
  publicationDate: string;
  publishedAt: string;
  status: "draft" | "published";
  summary: string;
  title: string;
}

interface SeedApprovedStandard {
  approvalDate: string;
  attachment?: SeedContentAttachment | null;
  code: string;
  createdByUserId: string;
  id: string;
  publicationDate: string;
  publishedAt: string;
  responsibleSubcommitteeId?: string | null;
  status: "draft" | "published";
  summary: string;
  title: string;
}

const organizations: SeedOrganization[] = [
  {
    id: "org-tk182-secretariat",
    name: 'НИЦ "Курчатовский институт" - ВИАМ',
    shortName: "ВИАМ",
    countryCode: "RU"
  },
  {
    id: "org-nauka-i-innovatsii",
    name: 'АО "Наука и инновации"',
    shortName: "Наука и инновации",
    countryCode: "RU"
  },
  {
    id: "org-tvel",
    name: 'АО "ТВЭЛ"',
    shortName: "ТВЭЛ",
    countryCode: "RU"
  },
  {
    id: "org-institut-standartizatsii",
    name: 'ФГБУ "Институт стандартизации"',
    shortName: "Институт стандартизации",
    countryCode: "RU"
  },
  {
    id: "org-rostandart",
    name: "Управление технического регулирования и стандартизации Росстандарта",
    shortName: "Росстандарт",
    countryCode: "RU"
  },
  {
    id: "org-ural-techmash",
    name: "АО «УралТехМаш»",
    shortName: "УралТехМаш",
    countryCode: "RU"
  },
  {
    id: "org-neva-control",
    name: "ООО «Нева Контроль»",
    shortName: "Нева Контроль",
    countryCode: "RU"
  }
];

const users: SeedUser[] = [
  {
    id: "user-admin",
    displayName: "Администратор портала",
    email: "admin@tk182.local",
    password: "AdminPass123!",
    role: "ADMIN",
    organizationId: "org-tk182-secretariat"
  },
  {
    id: "user-secretariat",
    displayName: "Елена Соколова",
    email: "secretariat@tk182.local",
    password: "SecretariatPass123!",
    role: "SECRETARIAT",
    organizationId: "org-tk182-secretariat"
  },
  {
    id: "user-participant",
    displayName: "Иван Петров",
    email: "participant@tk182.local",
    password: "ParticipantPass123!",
    role: "PARTICIPANT",
    organizationId: "org-ural-techmash"
  },
  {
    id: "user-participant-2",
    displayName: "Ольга Смирнова",
    email: "participant2@tk182.local",
    password: "Participant2Pass123!",
    role: "PARTICIPANT",
    organizationId: "org-neva-control"
  }
];

const documents: SeedDocument[] = [
  {
    id: "doc-public-charter",
    title: "Паспорт локального MVP портала ТК 182",
    category: "public-overview",
    visibility: "public",
    summary: "Краткое описание целей портала, состава модулей и этапов локального MVP.",
    publishedAt: "2026-01-15T09:00:00.000Z",
    createdByUserId: "user-admin",
    organizationId: "org-tk182-secretariat"
  },
  {
    id: "doc-participant-guidance",
    title: "Памятка участника по внесению замечаний",
    category: "participant-guidance",
    visibility: "participant",
    summary: "Порядок подготовки замечаний, итоговой позиции и сроков ответа по циклу согласования.",
    publishedAt: "2026-04-12T09:00:00.000Z",
    createdByUserId: "user-secretariat",
    organizationId: "org-tk182-secretariat"
  },
  {
    id: "doc-secretariat-brief",
    title: "Регламент секретариата по обработке отзывов",
    category: "secretariat-operations",
    visibility: "secretariat",
    summary: "Внутренние правила проверки комментариев, подготовки ответов и контроля сроков согласования.",
    publishedAt: "2026-04-14T09:00:00.000Z",
    createdByUserId: "user-secretariat",
    organizationId: "org-tk182-secretariat"
  }
];

const draftStandards: SeedDraftStandard[] = [
  {
    id: "draft-standard-fire-sensors",
    code: "ТК182-01-2026",
    responsibleSubcommitteeId: "subcommittee-pk5",
    title: "Умные датчики пожарной безопасности для промышленных объектов",
    summary:
      "Проект стандарта по структуре данных, диагностике и обмену сообщениями для промышленных датчиков пожарной безопасности.",
    stage: "На согласовании"
  },
  {
    id: "draft-standard-telemetry",
    code: "ТК182-02-2026",
    responsibleSubcommitteeId: "subcommittee-pk3",
    title: "Протокол передачи телеметрии для распределенных производственных систем",
    summary:
      "Проект стандарта по унифицированной телеметрии, отметкам времени и обмену статусами между производственными узлами.",
    stage: "Архив согласования"
  }
];

const committeeRoles: SeedCommitteeRole[] = [
  {
    id: "committee-role-co-chair",
    code: "CO_CHAIR",
    title: "Сопредседатель",
    category: "leadership",
    sortOrder: 10
  },
  {
    id: "committee-role-deputy-co-chair",
    code: "DEPUTY_CO_CHAIR",
    title: "Заместитель сопредседателя",
    category: "deputy",
    sortOrder: 20
  },
  {
    id: "committee-role-responsible-secretary",
    code: "RESPONSIBLE_SECRETARY",
    title: "Ответственный секретарь",
    category: "secretariat",
    sortOrder: 30
  },
  {
    id: "committee-role-rostandart-representative",
    code: "ROSSTANDART_REPRESENTATIVE",
    title: "Полномочный представитель Росстандарта",
    category: "secretariat",
    sortOrder: 40
  }
];

const committeePeople: SeedCommitteePerson[] = [
  {
    id: "committee-person-yakovlev",
    fullName: "Яковлев Сергей Викторович",
    jobTitle: 'Генеральный директор НИЦ "Курчатовский институт" - ВИАМ',
    organizationId: "org-tk182-secretariat"
  },
  {
    id: "committee-person-dub",
    fullName: "Дуб Алексей Владимирович",
    jobTitle: 'Первый заместитель генерального директора АО "Наука и инновации"',
    organizationId: "org-nauka-i-innovatsii"
  },
  {
    id: "committee-person-pakhomova",
    fullName: "Пахомова Елена Дмитриевна",
    jobTitle: 'Начальник лаборатории НИЦ "Курчатовский институт" - ВИАМ',
    organizationId: "org-tk182-secretariat"
  },
  {
    id: "committee-person-kryukov",
    fullName: "Крюков Александр Сергеевич",
    jobTitle: 'Начальник отдела стандартизации и сертификации АО "ТВЭЛ"',
    organizationId: "org-tvel"
  },
  {
    id: "committee-person-pronin",
    fullName: "Пронин Илья Андреевич",
    jobTitle: 'начальник сектора НИЦ "Курчатовский институт" - ВИАМ',
    organizationId: "org-tk182-secretariat"
  },
  {
    id: "committee-person-evdokimova",
    fullName: "Евдокимова Анастасия Валериевна",
    jobTitle:
      "Главный специалист-эксперт Управления технического регулирования и стандартизации",
    organizationId: "org-rostandart"
  }
];

const committeePersonRoles: SeedCommitteePersonRole[] = [
  {
    id: "committee-person-role-yakovlev",
    committeePersonId: "committee-person-yakovlev",
    committeeRoleId: "committee-role-co-chair",
    sortOrder: 10
  },
  {
    id: "committee-person-role-dub",
    committeePersonId: "committee-person-dub",
    committeeRoleId: "committee-role-co-chair",
    sortOrder: 20
  },
  {
    id: "committee-person-role-pakhomova",
    committeePersonId: "committee-person-pakhomova",
    committeeRoleId: "committee-role-deputy-co-chair",
    sortOrder: 10
  },
  {
    id: "committee-person-role-kryukov",
    committeePersonId: "committee-person-kryukov",
    committeeRoleId: "committee-role-deputy-co-chair",
    sortOrder: 20
  },
  {
    id: "committee-person-role-pronin",
    committeePersonId: "committee-person-pronin",
    committeeRoleId: "committee-role-responsible-secretary",
    sortOrder: 10
  },
  {
    id: "committee-person-role-evdokimova",
    committeePersonId: "committee-person-evdokimova",
    committeeRoleId: "committee-role-rostandart-representative",
    sortOrder: 20
  }
];

const subcommittees: SeedSubcommittee[] = [
  {
    id: "subcommittee-pk1",
    code: "ПК 1",
    title: "Материалы для аддитивных технологий",
    hostOrganizationId: "org-tk182-secretariat"
  },
  {
    id: "subcommittee-pk2",
    code: "ПК 2",
    title: "Оборудование и программное обеспечение для аддитивных технологий",
    hostOrganizationId: "org-nauka-i-innovatsii"
  },
  {
    id: "subcommittee-pk3",
    code: "ПК 3",
    title:
      "Управление жизненным циклом продукции аддитивного производства",
    hostOrganizationId: "org-nauka-i-innovatsii"
  },
  {
    id: "subcommittee-pk4",
    code: "ПК 4",
    title:
      "Организационно-методические и общетехнические вопросы стандартизации, классификации, терминологии, кодирования и каталогизации",
    hostOrganizationId: "org-institut-standartizatsii"
  },
  {
    id: "subcommittee-pk5",
    code: "ПК 5",
    title:
      "Неразрушающий контроль изделий, выполненных по аддитивным технологиям",
    hostOrganizationId: "org-tk182-secretariat"
  },
  {
    id: "subcommittee-pk6",
    code: "ПК 6",
    title: "Испытания изделий, выполненных по аддитивным технологиям",
    hostOrganizationId: "org-tk182-secretariat"
  },
  {
    id: "subcommittee-pk7",
    code: "ПК 7",
    title: "Материалы и аддитивные технологии в медицине",
    hostOrganizationId: "org-nauka-i-innovatsii"
  }
];

const draftStandardVersions: SeedDraftStandardVersion[] = [
  {
    id: "draft-standard-fire-sensors-v1",
    draftStandardId: "draft-standard-fire-sensors",
    versionLabel: "Редакция 1.0",
    revisionSummary: "Первичная редакция проекта для внутреннего обсуждения.",
    fileName: "TK182-01-2026_Редакция_1.0.docx",
    fileNote: "Основной текст проекта стандарта для цикла подготовки замечаний.",
    publishedAt: "2026-03-05T09:00:00.000Z"
  },
  {
    id: "draft-standard-fire-sensors-v2",
    draftStandardId: "draft-standard-fire-sensors",
    versionLabel: "Редакция 1.1",
    revisionSummary:
      "Уточнены требования к диагностическим сообщениям и формат карточки события.",
    fileName: "TK182-01-2026_Редакция_1.1.docx",
    fileNote: "Актуальная версия для активного цикла согласования.",
    publishedAt: "2026-04-10T09:00:00.000Z"
  },
  {
    id: "draft-standard-telemetry-v1",
    draftStandardId: "draft-standard-telemetry",
    versionLabel: "Редакция 0.9",
    revisionSummary: "Редакция, прошедшая закрытый цикл рассмотрения предложений от участников.",
    fileName: "TK182-02-2026_Редакция_0.9.docx",
    fileNote: "Архивная редакция с завершенным циклом согласования.",
    publishedAt: "2026-01-28T09:00:00.000Z"
  }
];

const reviewCycles: SeedReviewCycle[] = [
  {
    id: "review-cycle-fire-sensors-apr",
    draftStandardId: "draft-standard-fire-sensors",
    draftStandardVersionId: "draft-standard-fire-sensors-v2",
    title: "Цикл согласования № 1 по проекту ТК182-01-2026",
    description:
      "Сбор замечаний по редакции 1.1 проекта стандарта о промышленных датчиках пожарной безопасности.",
    status: "open",
    opensAt: "2026-04-15T09:00:00.000Z",
    deadlineAt: "2026-05-20T18:00:00.000Z",
    createdByUserId: "user-secretariat"
  },
  {
    id: "review-cycle-telemetry-feb",
    draftStandardId: "draft-standard-telemetry",
    draftStandardVersionId: "draft-standard-telemetry-v1",
    title: "Закрытый цикл согласования по проекту ТК182-02-2026",
    description:
      "Архивный цикл по протоколу передачи телеметрии. Ответы участников уже зафиксированы.",
    status: "closed",
    opensAt: "2026-02-01T09:00:00.000Z",
    deadlineAt: "2026-03-10T18:00:00.000Z",
    closedAt: "2026-03-18T12:00:00.000Z",
    createdByUserId: "user-secretariat"
  }
];

const reviewAssignments: SeedReviewAssignment[] = [
  {
    id: "assignment-fire-sensors-ural",
    reviewCycleId: "review-cycle-fire-sensors-apr",
    organizationId: "org-ural-techmash",
    userId: "user-participant"
  },
  {
    id: "assignment-fire-sensors-neva",
    reviewCycleId: "review-cycle-fire-sensors-apr",
    organizationId: "org-neva-control",
    userId: "user-participant-2",
    respondedAt: "2026-04-19T14:20:00.000Z"
  },
  {
    id: "assignment-telemetry-ural",
    reviewCycleId: "review-cycle-telemetry-feb",
    organizationId: "org-ural-techmash",
    userId: "user-participant",
    respondedAt: "2026-03-07T11:30:00.000Z"
  },
  {
    id: "assignment-telemetry-neva",
    reviewCycleId: "review-cycle-telemetry-feb",
    organizationId: "org-neva-control",
    userId: "user-participant-2",
    respondedAt: "2026-03-08T16:45:00.000Z"
  }
];

const reviewComments: SeedReviewComment[] = [
  {
    id: "comment-fire-sensors-ural-1",
    reviewCycleId: "review-cycle-fire-sensors-apr",
    draftStandardId: "draft-standard-fire-sensors",
    draftStandardVersionId: "draft-standard-fire-sensors-v2",
    reviewAssignmentId: "assignment-fire-sensors-ural",
    authorUserId: "user-participant",
    organizationId: "org-ural-techmash",
    sectionRef: "Раздел 5",
    pointRef: "п. 5.2",
    pageRef: "12",
    remark:
      "Не хватает требования к периодичности самодиагностики датчика при длительном автономном режиме.",
    proposedText:
      "Добавить норму: «Самодиагностика должна выполняться не реже одного раза в 24 часа».",
    rationale:
      "Для промышленных объектов длительное отсутствие самодиагностики повышает риск скрытого отказа.",
    reviewStatus: "RECEIVED",
    createdAt: "2026-04-18T10:15:00.000Z",
    updatedAt: "2026-04-18T10:15:00.000Z"
  },
  {
    id: "comment-fire-sensors-neva-1",
    reviewCycleId: "review-cycle-fire-sensors-apr",
    draftStandardId: "draft-standard-fire-sensors",
    draftStandardVersionId: "draft-standard-fire-sensors-v2",
    reviewAssignmentId: "assignment-fire-sensors-neva",
    authorUserId: "user-participant-2",
    organizationId: "org-neva-control",
    sectionRef: "Раздел 7",
    pointRef: "таблица 3",
    pageRef: "19",
    remark:
      "Предлагаем уточнить формат кодов состояний для событий перегрева и обрыва линии связи.",
    proposedText:
      "Ввести отдельные коды событий `OVH` и `LIN` с обязательной отметкой времени источника.",
    rationale:
      "Это позволит унифицировать интеграцию с существующими диспетчерскими системами предприятия.",
    reviewStatus: "IN_REVIEW",
    secretariatResponse:
      "Замечание принято в работу, формулировка будет согласована с редакторской группой.",
    createdAt: "2026-04-17T09:30:00.000Z",
    updatedAt: "2026-04-20T08:10:00.000Z"
  },
  {
    id: "comment-telemetry-ural-1",
    reviewCycleId: "review-cycle-telemetry-feb",
    draftStandardId: "draft-standard-telemetry",
    draftStandardVersionId: "draft-standard-telemetry-v1",
    reviewAssignmentId: "assignment-telemetry-ural",
    authorUserId: "user-participant",
    organizationId: "org-ural-techmash",
    sectionRef: "Раздел 4",
    pointRef: "п. 4.4",
    pageRef: "8",
    remark:
      "Следует уточнить допустимое отклонение отметки времени между узлом и центральным сервером.",
    proposedText:
      "Установить предельное отклонение не более 500 мс для штатного режима передачи телеметрии.",
    rationale:
      "Без явного допуска участникам сложно обеспечить сопоставимость событий из разных подсистем.",
    reviewStatus: "ACCEPTED",
    secretariatResponse:
      "Предложение принято. Ограничение будет включено в следующую редакцию проекта.",
    createdAt: "2026-03-03T13:20:00.000Z",
    updatedAt: "2026-03-12T12:00:00.000Z"
  },
  {
    id: "comment-telemetry-neva-1",
    reviewCycleId: "review-cycle-telemetry-feb",
    draftStandardId: "draft-standard-telemetry",
    draftStandardVersionId: "draft-standard-telemetry-v1",
    reviewAssignmentId: "assignment-telemetry-neva",
    authorUserId: "user-participant-2",
    organizationId: "org-neva-control",
    sectionRef: "Раздел 6",
    pointRef: "п. 6.1",
    pageRef: "14",
    remark:
      "Предлагаем сократить обязательный набор полей в сообщении диагностики для полевых контроллеров.",
    proposedText:
      "Сделать поле «серийный номер блока» необязательным для устройств нижнего уровня.",
    rationale:
      "Часть действующих контроллеров не передает этот параметр без модернизации встроенного ПО.",
    reviewStatus: "PARTIALLY_ACCEPTED",
    secretariatResponse:
      "Поле сохранено обязательным для новых устройств, но для совместимости будет добавлен переходный период.",
    createdAt: "2026-03-05T15:05:00.000Z",
    updatedAt: "2026-03-14T09:40:00.000Z"
  }
];

const participantPositions: SeedParticipantPosition[] = [
  {
    id: "position-fire-sensors-neva",
    reviewCycleId: "review-cycle-fire-sensors-apr",
    reviewAssignmentId: "assignment-fire-sensors-neva",
    organizationId: "org-neva-control",
    submittedByUserId: "user-participant-2",
    position: "AGREED_WITH_COMMENTS",
    note:
      "Проект в целом поддерживается, но замечание по кодам событий просим учесть до выпуска следующей редакции.",
    submittedAt: "2026-04-19T14:20:00.000Z"
  },
  {
    id: "position-telemetry-ural",
    reviewCycleId: "review-cycle-telemetry-feb",
    reviewAssignmentId: "assignment-telemetry-ural",
    organizationId: "org-ural-techmash",
    submittedByUserId: "user-participant",
    position: "AGREED_WITH_COMMENTS",
    note: "Согласовано с замечаниями, отраженными в карточках комментариев.",
    submittedAt: "2026-03-07T11:30:00.000Z"
  },
  {
    id: "position-telemetry-neva",
    reviewCycleId: "review-cycle-telemetry-feb",
    reviewAssignmentId: "assignment-telemetry-neva",
    organizationId: "org-neva-control",
    submittedByUserId: "user-participant-2",
    position: "AGREED",
    note: "Согласовано без дополнительных условий.",
    submittedAt: "2026-03-08T16:45:00.000Z"
  }
];

const versionFiles: SeedVersionFile[] = [
  {
    id: "version-file-fire-sensors-cover-note",
    versionId: "draft-standard-fire-sensors-v2",
    originalName: "Пояснительная_записка_к_редакции_1.1.txt",
    mimeType: "text/plain",
    uploadedByUserId: "user-secretariat",
    visibility: "ASSIGNED_PARTICIPANTS",
    description:
      "Краткая пояснительная записка по изменениям в редакции 1.1 для участников согласования.",
    uploadedAt: "2026-04-15T09:05:00.000Z",
    content: [
      "Пояснительная записка к редакции 1.1",
      "",
      "1. Уточнены диагностические сообщения датчиков.",
      "2. Скорректирован формат карточки события.",
      "3. Просим участников дать замечания до установленного срока."
    ].join("\n")
  },
  {
    id: "version-file-fire-sensors-response-template",
    versionId: "draft-standard-fire-sensors-v2",
    originalName: "Форма_замечаний_ТК182-01-2026.txt",
    mimeType: "text/plain",
    uploadedByUserId: "user-secretariat",
    visibility: "ASSIGNED_PARTICIPANTS",
    description:
      "Шаблон перечня замечаний для подготовки позиции организации по активному циклу.",
    uploadedAt: "2026-04-15T09:10:00.000Z",
    content: [
      "Форма замечаний",
      "",
      "Раздел:",
      "Пункт:",
      "Страница:",
      "Замечание:",
      "Предлагаемая редакция:",
      "Обоснование:"
    ].join("\n")
  },
  {
    id: "version-file-fire-sensors-secretariat-note",
    versionId: "draft-standard-fire-sensors-v2",
    originalName: "Служебная_сводка_секретариата_по_редакции_1.1.txt",
    mimeType: "text/plain",
    uploadedByUserId: "user-secretariat",
    visibility: "SECRETARIAT_ONLY",
    description:
      "Внутренняя сводка секретариата по ожидаемым замечаниям и контрольным точкам цикла.",
    uploadedAt: "2026-04-16T08:30:00.000Z",
    content: [
      "Служебная сводка секретариата",
      "",
      "1. Контроль получения отзывов от участников.",
      "2. Проверка замечаний по разделам 5 и 7.",
      "3. Подготовка ответа редакторской группе."
    ].join("\n")
  },
  {
    id: "version-file-telemetry-archive-note",
    versionId: "draft-standard-telemetry-v1",
    originalName: "Сводка_учтенных_замечаний_ТК182-02-2026.txt",
    mimeType: "text/plain",
    uploadedByUserId: "user-secretariat",
    visibility: "ASSIGNED_PARTICIPANTS",
    description:
      "Архивная сводка по замечаниям участников, учтенным по завершенному циклу согласования.",
    uploadedAt: "2026-03-18T12:05:00.000Z",
    content: [
      "Сводка учтенных замечаний",
      "",
      "1. Ограничение по отметке времени добавлено.",
      "2. Для совместимости введен переходный период по диагностическим полям.",
      "3. Цикл согласования закрыт."
    ].join("\n")
  }
];

const notifications: SeedNotification[] = [
  {
    id: "notification-assignment-user-participant",
    recipientUserId: "user-participant",
    type: "ASSIGNED_TO_ACTIVE_CYCLE",
    title: "Назначен новый цикл согласования",
    message:
      "Вам назначен активный цикл согласования по проекту ТК182-01-2026. Проверьте карточку проекта и подготовьте замечания.",
    createdAt: "2026-04-15T09:15:00.000Z",
    relatedCycleId: "review-cycle-fire-sensors-apr",
    relatedDraftStandardId: "draft-standard-fire-sensors",
    targetRoute:
      "/participant/reviews/review-cycle-fire-sensors-apr/draft-standard-fire-sensors"
  },
  {
    id: "notification-assignment-user-participant-2",
    recipientUserId: "user-participant-2",
    type: "ASSIGNED_TO_ACTIVE_CYCLE",
    title: "Назначен новый цикл согласования",
    message:
      "Вам назначен активный цикл согласования по проекту ТК182-01-2026. Ознакомьтесь с редакцией 1.1 и файлами версии.",
    createdAt: "2026-04-15T09:16:00.000Z",
    readAt: "2026-04-16T11:00:00.000Z",
    relatedCycleId: "review-cycle-fire-sensors-apr",
    relatedDraftStandardId: "draft-standard-fire-sensors",
    targetRoute:
      "/participant/reviews/review-cycle-fire-sensors-apr/draft-standard-fire-sensors"
  }
];

const newsItems: SeedNewsItem[] = [
  {
    id: "news-portal-content-launch",
    title: "На портале ТК 182 открыт новый публичный контур публикаций",
    excerpt:
      "Секретариат ТК 182 начал перенос новостей, документов и материалов заседаний в новый портал.",
    body: [
      "Секретариат ТК 182 открыл в новом портале реальные разделы для новостей, документов, заседаний и утвержденных стандартов.",
      "",
      "Контент наполняется вручную в backoffice и подготавливается для поэтапной миграции материалов со старого сайта.",
      "",
      "Все опубликованные материалы доступны на публичной части портала."
    ].join("\n"),
    status: "published",
    publicationDate: "2026-04-18T09:00:00.000Z",
    publishedAt: "2026-04-18T09:00:00.000Z",
    createdByUserId: "user-secretariat"
  },
  {
    id: "news-national-standards-program-2026",
    title: "Подготовлена программа разработки национальных стандартов ТК 182 на 2026 год",
    excerpt:
      "В публичном разделе опубликован актуальный комплект материалов по программе разработки национальных стандартов.",
    body: [
      "На портале размещены материалы по программе разработки национальных стандартов ТК 182 на 2026 год.",
      "",
      "В программе отражены приоритетные направления работ по подкомитетам, ожидаемые результаты и план публикации документов.",
      "",
      "Секретариат продолжит пополнять раздел по мере подготовки новых редакций."
    ].join("\n"),
    status: "published",
    publicationDate: "2026-04-19T10:30:00.000Z",
    publishedAt: "2026-04-19T10:30:00.000Z",
    createdByUserId: "user-secretariat"
  }
];

const publicDocuments: SeedPublicDocument[] = [
  {
    id: "public-document-main-regulation",
    title: "Положение о ТК 182",
    category: "MAIN_DOCUMENTS",
    summary:
      "Основной документ о задачах, составе и порядке работы технического комитета 182.",
    status: "published",
    publicationDate: "2026-01-20T09:00:00.000Z",
    publishedAt: "2026-01-20T09:00:00.000Z",
    createdByUserId: "user-secretariat",
    attachment: {
      originalName: "Polozhenie_o_TK_182.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-01-20T09:00:00.000Z",
      description: "Текстовая демонстрационная версия положения о ТК 182.",
      content: [
        "Положение о ТК 182",
        "",
        "1. ТК 182 ведет работы по стандартизации в области аддитивных технологий.",
        "2. Структура комитета включает руководство, секретариат и подкомитеты ПК 1–ПК 7.",
        "3. Портал используется как единый контур публикаций и согласования."
      ].join("\n")
    }
  },
  {
    id: "public-document-work-report-2025",
    title: "Отчет о работе ТК 182 за 2025 год",
    category: "WORK_REPORTS",
    summary:
      "Сводный отчет по рассмотренным проектам, заседаниям и результатам работ за 2025 год.",
    status: "published",
    publicationDate: "2026-02-05T12:00:00.000Z",
    publishedAt: "2026-02-05T12:00:00.000Z",
    createdByUserId: "user-secretariat",
    attachment: {
      originalName: "Otchet_o_rabote_TK182_2025.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-02-05T12:00:00.000Z",
      description: "Демонстрационный файл годового отчета.",
      content: [
        "Отчет о работе ТК 182 за 2025 год",
        "",
        "1. Проведено 4 заседания комитета.",
        "2. Подготовлены проекты документов по направлениям ПК 1, ПК 3 и ПК 5.",
        "3. Сформирована программа работ на следующий период."
      ].join("\n")
    }
  },
  {
    id: "public-document-work-plan-2026",
    title: "План и перспективная программа работ ТК 182 на 2026 год",
    category: "WORK_PLANS",
    summary:
      "План ключевых работ комитета, заседаний и публикаций по направлениям стандартизации.",
    status: "published",
    publicationDate: "2026-03-01T09:30:00.000Z",
    publishedAt: "2026-03-01T09:30:00.000Z",
    createdByUserId: "user-secretariat",
    attachment: {
      originalName: "Plan_rabot_TK182_2026.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-03-01T09:30:00.000Z",
      description: "Демонстрационный файл плана работ ТК 182.",
      content: [
        "План работ ТК 182 на 2026 год",
        "",
        "1. Подготовить новые редакции проектов по аддитивным материалам и контролю качества.",
        "2. Провести два открытых заседания и одно установочное совещание секретариата.",
        "3. Обновить программу разработки национальных стандартов."
      ].join("\n")
    }
  },
  {
    id: "public-document-national-program-2026",
    title: "Программа разработки национальных стандартов ТК 182 на 2026 год",
    category: "NATIONAL_STANDARDS_PROGRAM",
    summary:
      "Сводный перечень планируемых к разработке и актуализации стандартов по направлениям ТК 182.",
    status: "published",
    publicationDate: "2026-03-10T10:00:00.000Z",
    publishedAt: "2026-03-10T10:00:00.000Z",
    createdByUserId: "user-secretariat",
    attachment: {
      originalName: "Programma_razrabotki_natsionalnykh_standartov_2026.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-03-10T10:00:00.000Z",
      description: "Демонстрационная текстовая версия программы разработки стандартов.",
      content: [
        "Программа разработки национальных стандартов на 2026 год",
        "",
        "ПК 1: материалы для аддитивных технологий.",
        "ПК 3: управление жизненным циклом продукции аддитивного производства.",
        "ПК 5: неразрушающий контроль изделий, выполненных по аддитивным технологиям."
      ].join("\n")
    }
  }
];

const meetingRecords: SeedMeetingRecord[] = [
  {
    id: "meeting-agenda-q2-2026",
    title: "Уведомление и повестка заседания ТК 182 от 24 апреля 2026 года",
    category: "MEETING_AGENDA",
    summary:
      "Повестка очередного заседания ТК 182 по проектам стандартов, структуре комитета и плану работ.",
    body: [
      "Повестка заседания ТК 182",
      "",
      "1. Рассмотрение статуса действующих проектов стандартов.",
      "2. Обсуждение программы разработки национальных стандартов.",
      "3. Утверждение плана публикации материалов на портале."
    ].join("\n"),
    location: 'Москва, НИЦ "Курчатовский институт" - ВИАМ',
    meetingDate: "2026-04-24T10:00:00.000Z",
    status: "published",
    publicationDate: "2026-04-16T09:00:00.000Z",
    publishedAt: "2026-04-16T09:00:00.000Z",
    createdByUserId: "user-secretariat",
    attachment: {
      originalName: "Povestka_zasedaniya_TK182_24_04_2026.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-04-16T09:00:00.000Z",
      description: "Текстовая версия уведомления и повестки заседания.",
      content: [
        "Уведомление и повестка заседания ТК 182",
        "",
        "Дата: 24.04.2026",
        "Место: НИЦ \"Курчатовский институт\" - ВИАМ",
        "Вопросы: проекты стандартов, программа работ, публикации на портале."
      ].join("\n")
    }
  },
  {
    id: "meeting-minutes-q1-2026",
    title: "Протокол заседания ТК 182 от 12 февраля 2026 года",
    category: "MEETING_MINUTES",
    summary:
      "Протокол заседания по вопросам структуры ТК 182, распределения работ по ПК и подготовки программы стандартизации.",
    body: [
      "Протокол заседания ТК 182",
      "",
      "1. Утверждена актуализированная структура руководства и секретариата.",
      "2. Подтверждены ответственные подкомитеты по действующим проектам.",
      "3. Секретариату поручено подготовить материалы для нового портала."
    ].join("\n"),
    location: 'Москва, НИЦ "Курчатовский институт" - ВИАМ',
    meetingDate: "2026-02-12T11:00:00.000Z",
    status: "published",
    publicationDate: "2026-02-20T12:00:00.000Z",
    publishedAt: "2026-02-20T12:00:00.000Z",
    createdByUserId: "user-secretariat",
    attachment: {
      originalName: "Protokol_zasedaniya_TK182_12_02_2026.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-02-20T12:00:00.000Z",
      description: "Текстовая версия протокола заседания ТК 182.",
      content: [
        "Протокол заседания ТК 182 от 12.02.2026",
        "",
        "Слушали: секретариат ТК 182.",
        "Постановили: обновить структуру ТК, программу работ и перечень публичных материалов.",
        "Контроль исполнения поручений возложен на секретариат."
      ].join("\n")
    }
  }
];

const approvedStandards: SeedApprovedStandard[] = [
  {
    id: "approved-standard-powder-materials-2025",
    code: "ГОСТ Р 70501-2025",
    title: "Материалы порошковые для аддитивных технологий. Общие технические требования",
    summary:
      "Утвержденный стандарт по базовым требованиям к порошковым материалам для аддитивного производства.",
    approvalDate: "2025-12-15T00:00:00.000Z",
    status: "published",
    publicationDate: "2026-01-15T09:00:00.000Z",
    publishedAt: "2026-01-15T09:00:00.000Z",
    createdByUserId: "user-secretariat",
    responsibleSubcommitteeId: "subcommittee-pk1",
    attachment: {
      originalName: "GOST_R_70501_2025.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-01-15T09:00:00.000Z",
      description: "Демонстрационный файл утвержденного стандарта.",
      content: [
        "ГОСТ Р 70501-2025",
        "",
        "Материалы порошковые для аддитивных технологий.",
        "Общие технические требования и методы контроля."
      ].join("\n")
    }
  },
  {
    id: "approved-standard-ndt-2025",
    code: "ГОСТ Р 70518-2025",
    title: "Неразрушающий контроль изделий, выполненных по аддитивным технологиям. Общие положения",
    summary:
      "Утвержденный стандарт по общим положениям неразрушающего контроля аддитивных изделий.",
    approvalDate: "2025-11-28T00:00:00.000Z",
    status: "published",
    publicationDate: "2026-02-01T09:00:00.000Z",
    publishedAt: "2026-02-01T09:00:00.000Z",
    createdByUserId: "user-secretariat",
    responsibleSubcommitteeId: "subcommittee-pk5",
    attachment: {
      originalName: "GOST_R_70518_2025.txt",
      mimeType: "text/plain",
      uploadedByUserId: "user-secretariat",
      uploadedAt: "2026-02-01T09:00:00.000Z",
      description: "Демонстрационный файл утвержденного стандарта по НК.",
      content: [
        "ГОСТ Р 70518-2025",
        "",
        "Неразрушающий контроль изделий, выполненных по аддитивным технологиям.",
        "Общие положения."
      ].join("\n")
    }
  }
];

async function main(): Promise<void> {
  const pool = createDatabasePool();
  const storageRootDirectory = getApplicationConfig().storage.rootDir;

  try {
    await runMigrations(pool);
    await rm(storageRootDirectory, { recursive: true, force: true });
    await ensureStorageRootDirectory(storageRootDirectory);

    const passwordHashes = new Map<string, string>();

    for (const user of users) {
      passwordHashes.set(user.id, await hashPassword(user.password));
    }

    const storedVersionFiles = versionFiles.map((file) => {
      const storedName = `${file.id}${getFileExtension(file.originalName)}`;
      const filePath = resolveStoredFilePath(storageRootDirectory, storedName);

      return {
        ...file,
        storedName,
        filePath: filePath.absolutePath
      };
    });

    const storedPublicDocumentFiles = publicDocuments
      .filter(
        (
          document
        ): document is SeedPublicDocument & { attachment: SeedContentAttachment } =>
          Boolean(document.attachment)
      )
      .map((document) => {
        const storedName = `${document.id}${getFileExtension(document.attachment.originalName)}`;
        const filePath = resolveStoredFilePath(storageRootDirectory, storedName);

        return {
          documentId: document.id,
          storedName,
          filePath: filePath.absolutePath,
          attachment: document.attachment
        };
      });

    const storedMeetingFiles = meetingRecords
      .filter(
        (
          meeting
        ): meeting is SeedMeetingRecord & { attachment: SeedContentAttachment } =>
          Boolean(meeting.attachment)
      )
      .map((meeting) => {
        const storedName = `${meeting.id}${getFileExtension(meeting.attachment.originalName)}`;
        const filePath = resolveStoredFilePath(storageRootDirectory, storedName);

        return {
          meetingId: meeting.id,
          storedName,
          filePath: filePath.absolutePath,
          attachment: meeting.attachment
        };
      });

    const storedApprovedStandardFiles = approvedStandards
      .filter(
        (
          standard
        ): standard is SeedApprovedStandard & { attachment: SeedContentAttachment } =>
          Boolean(standard.attachment)
      )
      .map((standard) => {
        const storedName = `${standard.id}${getFileExtension(standard.attachment.originalName)}`;
        const filePath = resolveStoredFilePath(storageRootDirectory, storedName);

        return {
          standardId: standard.id,
          storedName,
          filePath: filePath.absolutePath,
          attachment: standard.attachment
        };
      });

    for (const file of storedVersionFiles) {
      await writeFile(file.filePath, file.content, "utf8");
    }

    for (const file of storedPublicDocumentFiles) {
      await writeFile(file.filePath, file.attachment.content, "utf8");
    }

    for (const file of storedMeetingFiles) {
      await writeFile(file.filePath, file.attachment.content, "utf8");
    }

    for (const file of storedApprovedStandardFiles) {
      await writeFile(file.filePath, file.attachment.content, "utf8");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM audit_events`);

      for (const organization of organizations) {
        await client.query(
          `
            INSERT INTO organizations (id, name, short_name, country_code, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              name = EXCLUDED.name,
              short_name = EXCLUDED.short_name,
              country_code = EXCLUDED.country_code,
              updated_at = NOW()
          `,
          [
            organization.id,
            organization.name,
            organization.shortName,
            organization.countryCode
          ]
        );
      }

      for (const user of users) {
        await client.query(
          `
            INSERT INTO users (
              id,
              email,
              display_name,
              password_hash,
              role,
              organization_id,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              email = EXCLUDED.email,
              display_name = EXCLUDED.display_name,
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              organization_id = EXCLUDED.organization_id,
              updated_at = NOW()
          `,
          [
            user.id,
            user.email,
            user.displayName,
            passwordHashes.get(user.id),
            user.role,
            user.organizationId
          ]
        );
      }

      for (const document of documents) {
        await client.query(
          `
            INSERT INTO documents (
              id,
              title,
              category,
              visibility,
              summary,
              organization_id,
              created_by_user_id,
              published_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              title = EXCLUDED.title,
              category = EXCLUDED.category,
              visibility = EXCLUDED.visibility,
              summary = EXCLUDED.summary,
              organization_id = EXCLUDED.organization_id,
              created_by_user_id = EXCLUDED.created_by_user_id,
              published_at = EXCLUDED.published_at,
              updated_at = NOW()
          `,
          [
            document.id,
            document.title,
            document.category,
            document.visibility,
            document.summary,
            document.organizationId,
            document.createdByUserId,
            document.publishedAt
          ]
        );
      }

      await client.query(`DELETE FROM sessions`);
      await client.query(`DELETE FROM notifications`);
      await client.query(`DELETE FROM news_items`);
      await client.query(`DELETE FROM public_documents`);
      await client.query(`DELETE FROM meeting_records`);
      await client.query(`DELETE FROM approved_standards`);
      await client.query(`DELETE FROM committee_person_roles`);
      await client.query(`DELETE FROM committee_people`);
      await client.query(`DELETE FROM committee_roles`);
      await client.query(`DELETE FROM participant_positions`);
      await client.query(`DELETE FROM review_comments`);
      await client.query(`DELETE FROM review_assignments`);
      await client.query(`DELETE FROM review_cycles`);
      await client.query(`DELETE FROM draft_standard_version_files`);
      await client.query(`DELETE FROM draft_standard_versions`);
      await client.query(`DELETE FROM draft_standards`);
      await client.query(`DELETE FROM subcommittees`);

      for (const newsItem of newsItems) {
        await client.query(
          `
            INSERT INTO news_items (
              id,
              title,
              excerpt,
              body,
              status,
              publication_date,
              published_at,
              created_by_user_id,
              updated_by_user_id,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, NOW())
          `,
          [
            newsItem.id,
            newsItem.title,
            newsItem.excerpt,
            newsItem.body,
            newsItem.status,
            newsItem.publicationDate,
            newsItem.publishedAt,
            newsItem.createdByUserId
          ]
        );
      }

      for (const document of publicDocuments) {
        const storedFile =
          storedPublicDocumentFiles.find((item) => item.documentId === document.id) ?? null;

        await client.query(
          `
            INSERT INTO public_documents (
              id,
              title,
              category,
              summary,
              status,
              publication_date,
              published_at,
              file_original_name,
              file_stored_name,
              file_mime_type,
              file_size_bytes,
              file_uploaded_at,
              file_uploaded_by_user_id,
              file_description,
              created_by_user_id,
              updated_by_user_id,
              updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12, $13, $14, $15, $15, NOW()
            )
          `,
          [
            document.id,
            document.title,
            document.category,
            document.summary,
            document.status,
            document.publicationDate,
            document.publishedAt,
            storedFile?.attachment.originalName ?? null,
            storedFile?.storedName ?? null,
            storedFile?.attachment.mimeType ?? null,
            storedFile ? Buffer.byteLength(storedFile.attachment.content, "utf8") : null,
            storedFile?.attachment.uploadedAt ?? null,
            storedFile?.attachment.uploadedByUserId ?? null,
            storedFile?.attachment.description ?? null,
            document.createdByUserId
          ]
        );
      }

      for (const meeting of meetingRecords) {
        const storedFile =
          storedMeetingFiles.find((item) => item.meetingId === meeting.id) ?? null;

        await client.query(
          `
            INSERT INTO meeting_records (
              id,
              title,
              category,
              summary,
              body,
              location,
              meeting_date,
              status,
              publication_date,
              published_at,
              file_original_name,
              file_stored_name,
              file_mime_type,
              file_size_bytes,
              file_uploaded_at,
              file_uploaded_by_user_id,
              file_description,
              created_by_user_id,
              updated_by_user_id,
              updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $18, NOW()
            )
          `,
          [
            meeting.id,
            meeting.title,
            meeting.category,
            meeting.summary,
            meeting.body,
            meeting.location ?? null,
            meeting.meetingDate,
            meeting.status,
            meeting.publicationDate,
            meeting.publishedAt,
            storedFile?.attachment.originalName ?? null,
            storedFile?.storedName ?? null,
            storedFile?.attachment.mimeType ?? null,
            storedFile ? Buffer.byteLength(storedFile.attachment.content, "utf8") : null,
            storedFile?.attachment.uploadedAt ?? null,
            storedFile?.attachment.uploadedByUserId ?? null,
            storedFile?.attachment.description ?? null,
            meeting.createdByUserId
          ]
        );
      }

      for (const role of committeeRoles) {
        await client.query(
          `
            INSERT INTO committee_roles (id, code, title, category, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE
            SET
              code = EXCLUDED.code,
              title = EXCLUDED.title,
              category = EXCLUDED.category,
              sort_order = EXCLUDED.sort_order
          `,
          [role.id, role.code, role.title, role.category, role.sortOrder]
        );
      }

      for (const person of committeePeople) {
        await client.query(
          `
            INSERT INTO committee_people (
              id,
              full_name,
              job_title,
              organization_id,
              updated_at
            )
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              full_name = EXCLUDED.full_name,
              job_title = EXCLUDED.job_title,
              organization_id = EXCLUDED.organization_id,
              updated_at = NOW()
          `,
          [person.id, person.fullName, person.jobTitle, person.organizationId]
        );
      }

      for (const personRole of committeePersonRoles) {
        await client.query(
          `
            INSERT INTO committee_person_roles (
              id,
              committee_person_id,
              committee_role_id,
              sort_order
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE
            SET
              committee_person_id = EXCLUDED.committee_person_id,
              committee_role_id = EXCLUDED.committee_role_id,
              sort_order = EXCLUDED.sort_order
          `,
          [
            personRole.id,
            personRole.committeePersonId,
            personRole.committeeRoleId,
            personRole.sortOrder
          ]
        );
      }

      for (const subcommittee of subcommittees) {
        await client.query(
          `
            INSERT INTO subcommittees (
              id,
              code,
              title,
              host_organization_id,
              updated_at
            )
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              code = EXCLUDED.code,
              title = EXCLUDED.title,
              host_organization_id = EXCLUDED.host_organization_id,
              updated_at = NOW()
          `,
          [
            subcommittee.id,
            subcommittee.code,
            subcommittee.title,
            subcommittee.hostOrganizationId
          ]
        );
      }

      for (const standard of approvedStandards) {
        const storedFile =
          storedApprovedStandardFiles.find((item) => item.standardId === standard.id) ?? null;

        await client.query(
          `
            INSERT INTO approved_standards (
              id,
              code,
              title,
              summary,
              approval_date,
              status,
              publication_date,
              published_at,
              responsible_subcommittee_id,
              file_original_name,
              file_stored_name,
              file_mime_type,
              file_size_bytes,
              file_uploaded_at,
              file_uploaded_by_user_id,
              file_description,
              created_by_user_id,
              updated_by_user_id,
              updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14, $15, $16, $17, $17, NOW()
            )
          `,
          [
            standard.id,
            standard.code,
            standard.title,
            standard.summary,
            standard.approvalDate,
            standard.status,
            standard.publicationDate,
            standard.publishedAt,
            standard.responsibleSubcommitteeId ?? null,
            storedFile?.attachment.originalName ?? null,
            storedFile?.storedName ?? null,
            storedFile?.attachment.mimeType ?? null,
            storedFile ? Buffer.byteLength(storedFile.attachment.content, "utf8") : null,
            storedFile?.attachment.uploadedAt ?? null,
            storedFile?.attachment.uploadedByUserId ?? null,
            storedFile?.attachment.description ?? null,
            standard.createdByUserId
          ]
        );
      }

      for (const draftStandard of draftStandards) {
        await client.query(
          `
            INSERT INTO draft_standards (
              id,
              code,
              title,
              summary,
              stage,
              responsible_subcommittee_id,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `,
          [
            draftStandard.id,
            draftStandard.code,
            draftStandard.title,
            draftStandard.summary,
            draftStandard.stage,
            draftStandard.responsibleSubcommitteeId
          ]
        );
      }

      for (const version of draftStandardVersions) {
        await client.query(
          `
            INSERT INTO draft_standard_versions (
              id,
              draft_standard_id,
              version_label,
              revision_summary,
              file_name,
              file_note,
              published_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `,
          [
            version.id,
            version.draftStandardId,
            version.versionLabel,
            version.revisionSummary,
            version.fileName,
            version.fileNote,
            version.publishedAt
          ]
        );
      }

      for (const reviewCycle of reviewCycles) {
        await client.query(
          `
            INSERT INTO review_cycles (
              id,
              draft_standard_id,
              draft_standard_version_id,
              title,
              description,
              status,
              opens_at,
              deadline_at,
              closed_at,
              created_by_user_id,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          `,
          [
            reviewCycle.id,
            reviewCycle.draftStandardId,
            reviewCycle.draftStandardVersionId,
            reviewCycle.title,
            reviewCycle.description,
            reviewCycle.status,
            reviewCycle.opensAt,
            reviewCycle.deadlineAt,
            reviewCycle.closedAt ?? null,
            reviewCycle.createdByUserId
          ]
        );
      }

      for (const assignment of reviewAssignments) {
        await client.query(
          `
            INSERT INTO review_assignments (
              id,
              review_cycle_id,
              organization_id,
              user_id,
              responded_at
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            assignment.id,
            assignment.reviewCycleId,
            assignment.organizationId,
            assignment.userId,
            assignment.respondedAt ?? null
          ]
        );
      }

      for (const comment of reviewComments) {
        await client.query(
          `
            INSERT INTO review_comments (
              id,
              review_cycle_id,
              draft_standard_id,
              draft_standard_version_id,
              review_assignment_id,
              author_user_id,
              organization_id,
              section_ref,
              point_ref,
              page_ref,
              remark,
              proposed_text,
              rationale,
              review_status,
              secretariat_response,
              created_at,
              updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17
            )
          `,
          [
            comment.id,
            comment.reviewCycleId,
            comment.draftStandardId,
            comment.draftStandardVersionId,
            comment.reviewAssignmentId,
            comment.authorUserId,
            comment.organizationId,
            comment.sectionRef,
            comment.pointRef ?? null,
            comment.pageRef ?? null,
            comment.remark,
            comment.proposedText,
            comment.rationale,
            comment.reviewStatus,
            comment.secretariatResponse ?? null,
            comment.createdAt,
            comment.updatedAt
          ]
        );
      }

      for (const position of participantPositions) {
        await client.query(
          `
            INSERT INTO participant_positions (
              id,
              review_cycle_id,
              review_assignment_id,
              organization_id,
              submitted_by_user_id,
              position,
              note,
              submitted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            position.id,
            position.reviewCycleId,
            position.reviewAssignmentId,
            position.organizationId,
            position.submittedByUserId,
            position.position,
            position.note ?? null,
            position.submittedAt
          ]
        );
      }

      for (const file of storedVersionFiles) {
        await client.query(
          `
            INSERT INTO draft_standard_version_files (
              id,
              version_id,
              original_name,
              stored_name,
              mime_type,
              size_bytes,
              uploaded_at,
              updated_at,
              uploaded_by_user_id,
              visibility,
              description
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10
            )
          `,
          [
            file.id,
            file.versionId,
            file.originalName,
            file.storedName,
            file.mimeType,
            Buffer.byteLength(file.content, "utf8"),
            file.uploadedAt,
            file.uploadedByUserId,
            file.visibility,
            file.description ?? null
          ]
        );
      }

      for (const notification of notifications) {
        await client.query(
          `
            INSERT INTO notifications (
              id,
              recipient_user_id,
              created_at,
              read_at,
              type,
              title,
              message,
              related_cycle_id,
              related_draft_standard_id,
              related_comment_id,
              related_file_id,
              target_route
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            )
          `,
          [
            notification.id,
            notification.recipientUserId,
            notification.createdAt,
            notification.readAt ?? null,
            notification.type,
            notification.title,
            notification.message,
            notification.relatedCycleId ?? null,
            notification.relatedDraftStandardId ?? null,
            notification.relatedCommentId ?? null,
            notification.relatedFileId ?? null,
            notification.targetRoute ?? null
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.info("Seed completed successfully.");
    console.info("Admin: admin@tk182.local / AdminPass123!");
    console.info("Secretariat: secretariat@tk182.local / SecretariatPass123!");
    console.info("Participant: participant@tk182.local / ParticipantPass123!");
    console.info("Participant 2: participant2@tk182.local / Participant2Pass123!");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed.", error);
  process.exit(1);
});
