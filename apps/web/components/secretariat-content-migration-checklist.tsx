import type {
  ContentMigrationChecklistEntry,
  ContentMigrationInfo,
  LegacyContentSection
} from "@tk182/shared-types";

import { formatLegacyContentSection } from "../lib/content";

const legacySections: LegacyContentSection[] = [
  "NEWS",
  "MAIN_DOCUMENTS",
  "WORK_REPORTS",
  "WORK_PLANS",
  "NATIONAL_STANDARDS_PROGRAM",
  "MEETING_AGENDA",
  "MEETING_MINUTES",
  "APPROVED_STANDARDS"
];

interface MigrationChecklistItem {
  migration: ContentMigrationInfo;
  title: string;
}

interface SecretariatContentMigrationChecklistProps {
  items: MigrationChecklistItem[];
}

function buildEntries(items: MigrationChecklistItem[]): ContentMigrationChecklistEntry[] {
  return legacySections.map((legacySection) => {
    const sectionItems = items.filter((item) => item.migration.legacySection === legacySection);
    const notImported = sectionItems.filter(
      (item) => item.migration.migrationStatus === "NOT_IMPORTED"
    );
    const imported = sectionItems.filter(
      (item) => item.migration.migrationStatus === "IMPORTED"
    );
    const verified = sectionItems.filter(
      (item) => item.migration.migrationStatus === "VERIFIED"
    );

    return {
      legacySection,
      itemsTotal: sectionItems.length,
      notImportedCount: notImported.length,
      migratedCount: imported.length,
      verifiedCount: verified.length,
      pendingTitles: [...notImported, ...imported].slice(0, 3).map((item) => item.title)
    };
  });
}

export function SecretariatContentMigrationChecklist({
  items
}: SecretariatContentMigrationChecklistProps) {
  const entries = buildEntries(items);
  const totalItems = items.length;
  const notImportedCount = items.filter(
    (item) => item.migration.migrationStatus === "NOT_IMPORTED"
  ).length;
  const importedCount = items.filter(
    (item) => item.migration.migrationStatus === "IMPORTED"
  ).length;
  const verifiedCount = items.filter(
    (item) => item.migration.migrationStatus === "VERIFIED"
  ).length;

  return (
    <article className="content-card">
      <h2>Чек-лист переноса контента</h2>
      <p className="status-note">
        Эта сводка показывает только записи, уже созданные в новом портале. Для полного
        объема legacy-материалов используйте отдельный реестр старого сайта ниже.
      </p>

      <div className="pill-row">
        <span className="pill">Всего записей: {totalItems}</span>
        <span className="pill">Не перенесено: {notImportedCount}</span>
        <span className="pill">Перенесено: {importedCount}</span>
        <span className="pill">Проверено: {verifiedCount}</span>
      </div>

      <div className="content-stack">
        {entries.map((entry) => (
          <div key={entry.legacySection} className="review-card">
            <div className="review-card-header">
              <div>
                <strong>{formatLegacyContentSection(entry.legacySection)}</strong>
                <p>
                  Всего записей: {entry.itemsTotal}. К переносу: {entry.notImportedCount},
                  ожидают проверки: {entry.migratedCount}, проверено: {entry.verifiedCount}.
                </p>
              </div>
              <div className="pill-row">
                <span className="pill">Не перенесено: {entry.notImportedCount}</span>
                <span className="pill">Перенесено: {entry.migratedCount}</span>
                <span className="pill">Проверено: {entry.verifiedCount}</span>
              </div>
            </div>
            {entry.pendingTitles.length > 0 ? (
              <div>
                <strong>Ближайшие записи к проверке</strong>
                <ul>
                  {entry.pendingTitles.map((title) => (
                    <li key={`${entry.legacySection}-${title}`}>{title}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="status-note">Для этого раздела нет незавершенных записей.</p>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
