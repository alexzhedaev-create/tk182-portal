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
  stage: string;
  summary: string;
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

const organizations: SeedOrganization[] = [
  {
    id: "org-tk182-secretariat",
    name: "Секретариат ТК 182",
    shortName: "Секретариат ТК 182",
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
    title: "Умные датчики пожарной безопасности для промышленных объектов",
    summary:
      "Проект стандарта по структуре данных, диагностике и обмену сообщениями для промышленных датчиков пожарной безопасности.",
    stage: "На согласовании"
  },
  {
    id: "draft-standard-telemetry",
    code: "ТК182-02-2026",
    title: "Протокол передачи телеметрии для распределенных производственных систем",
    summary:
      "Проект стандарта по унифицированной телеметрии, отметкам времени и обмену статусами между производственными узлами.",
    stage: "Архив согласования"
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

    for (const file of storedVersionFiles) {
      await writeFile(file.filePath, file.content, "utf8");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

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
      await client.query(`DELETE FROM participant_positions`);
      await client.query(`DELETE FROM review_comments`);
      await client.query(`DELETE FROM review_assignments`);
      await client.query(`DELETE FROM review_cycles`);
      await client.query(`DELETE FROM draft_standard_version_files`);
      await client.query(`DELETE FROM draft_standard_versions`);
      await client.query(`DELETE FROM draft_standards`);

      for (const draftStandard of draftStandards) {
        await client.query(
          `
            INSERT INTO draft_standards (id, code, title, summary, stage, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `,
          [
            draftStandard.id,
            draftStandard.code,
            draftStandard.title,
            draftStandard.summary,
            draftStandard.stage
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
