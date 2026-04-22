"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  LegacyContentInventoryRecord,
  LegacyContentInventoryStatus,
  LegacyContentSection,
  LinkedPortalEntityReference,
  LinkedPortalEntityType
} from "@tk182/shared-types";

import {
  formatLegacyContentInventoryStatus,
  formatLegacyContentSection,
  formatLinkedPortalEntityType
} from "../lib/content";
import { extractApiErrorMessage, toDateInputValue } from "../lib/form-utils";
import { formatDate } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

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

const inventoryStatuses: LegacyContentInventoryStatus[] = [
  "FOUND",
  "CREATED_IN_PORTAL",
  "VERIFIED",
  "SKIPPED"
];

const linkedPortalEntityTypes: LinkedPortalEntityType[] = [
  "NEWS_ITEM",
  "PUBLIC_DOCUMENT",
  "MEETING_RECORD",
  "APPROVED_STANDARD"
];

interface SecretariatLegacyContentInventoryPanelProps {
  inventoryRecords: LegacyContentInventoryRecord[];
  portalOptions: LinkedPortalEntityReference[];
}

function serializeLinkedPortalValue(linkedPortalRecord: LinkedPortalEntityReference | null): string {
  return linkedPortalRecord
    ? `${linkedPortalRecord.entityType}::${linkedPortalRecord.entityId}`
    : "";
}

function parseLinkedPortalValue(value: string): {
  linkedPortalEntityId: string | null;
  linkedPortalEntityType: LinkedPortalEntityType | null;
} {
  if (!value) {
    return {
      linkedPortalEntityId: null,
      linkedPortalEntityType: null
    };
  }

  const [linkedPortalEntityType, linkedPortalEntityId] = value.split("::", 2);

  return {
    linkedPortalEntityType: linkedPortalEntityType as LinkedPortalEntityType,
    linkedPortalEntityId: linkedPortalEntityId ?? null
  };
}

export function SecretariatLegacyContentInventoryPanel({
  inventoryRecords,
  portalOptions
}: SecretariatLegacyContentInventoryPanelProps) {
  const router = useRouter();
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [legacySection, setLegacySection] = useState<LegacyContentSection>("NEWS");
  const [legacyTitle, setLegacyTitle] = useState("");
  const [legacyUrl, setLegacyUrl] = useState("");
  const [legacyDate, setLegacyDate] = useState("");
  const [legacyType, setLegacyType] = useState("");
  const [migrationStatus, setMigrationStatus] =
    useState<LegacyContentInventoryStatus>("FOUND");
  const [migrationNote, setMigrationNote] = useState("");
  const [linkedPortalValue, setLinkedPortalValue] = useState("");
  const [filterSection, setFilterSection] = useState<LegacyContentSection | "ALL">("ALL");
  const [filterStatus, setFilterStatus] =
    useState<LegacyContentInventoryStatus | "ALL">("ALL");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedRecord =
    inventoryRecords.find((item) => item.id === selectedRecordId) ?? null;
  const isEditMode = Boolean(selectedRecord);

  const visibleRecords = inventoryRecords.filter((item) => {
    if (filterSection !== "ALL" && item.legacySection !== filterSection) {
      return false;
    }

    if (filterStatus !== "ALL" && item.migrationStatus !== filterStatus) {
      return false;
    }

    return true;
  });

  const sectionSummary = useMemo(
    () =>
      legacySections.map((section) => {
        const items = inventoryRecords.filter((item) => item.legacySection === section);

        return {
          section,
          total: items.length,
          found: items.filter((item) => item.migrationStatus === "FOUND").length,
          createdInPortal: items.filter(
            (item) => item.migrationStatus === "CREATED_IN_PORTAL"
          ).length,
          verified: items.filter((item) => item.migrationStatus === "VERIFIED").length,
          skipped: items.filter((item) => item.migrationStatus === "SKIPPED").length
        };
      }),
    [inventoryRecords]
  );

  const groupedPortalOptions = useMemo(
    () =>
      linkedPortalEntityTypes.map((entityType) => ({
        entityType,
        items: portalOptions.filter((item) => item.entityType === entityType)
      })),
    [portalOptions]
  );

  useEffect(() => {
    if (!selectedRecord) {
      setLegacySection("NEWS");
      setLegacyTitle("");
      setLegacyUrl("");
      setLegacyDate("");
      setLegacyType("");
      setMigrationStatus("FOUND");
      setMigrationNote("");
      setLinkedPortalValue("");
      return;
    }

    setLegacySection(selectedRecord.legacySection);
    setLegacyTitle(selectedRecord.legacyTitle);
    setLegacyUrl(selectedRecord.legacyUrl ?? "");
    setLegacyDate(selectedRecord.legacyDate ? toDateInputValue(selectedRecord.legacyDate) : "");
    setLegacyType(selectedRecord.legacyType ?? "");
    setMigrationStatus(selectedRecord.migrationStatus);
    setMigrationNote(selectedRecord.migrationNote ?? "");
    setLinkedPortalValue(serializeLinkedPortalValue(selectedRecord.linkedPortalRecord));
  }, [selectedRecord]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const linkedPortal = parseLinkedPortalValue(linkedPortalValue);

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/content/backoffice/inventory/${encodeURIComponent(selectedRecord!.id)}`
        : `${apiBaseUrl}/content/backoffice/inventory`,
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          legacySection,
          legacyTitle,
          legacyUrl,
          legacyDate: legacyDate ? `${legacyDate}T00:00:00.000Z` : null,
          legacyType,
          migrationStatus,
          migrationNote,
          ...linkedPortal
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить запись реестра."
            : "Не удалось создать запись реестра."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      isEditMode
        ? "Запись реестра старого сайта обновлена."
        : "Запись реестра старого сайта создана."
    );

    if (!isEditMode) {
      setSelectedRecordId("");
      setLegacySection("NEWS");
      setLegacyTitle("");
      setLegacyUrl("");
      setLegacyDate("");
      setLegacyType("");
      setMigrationStatus("FOUND");
      setMigrationNote("");
      setLinkedPortalValue("");
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="secretariat-legacy-content-inventory-panel">
      <h2>Реестр материалов старого сайта</h2>
      <p className="status-note">
        Реестр фиксирует полный объем legacy-материалов до создания записей в портале и
        помогает секретариату контролировать перенос по разделам, статусам и связи с
        опубликованным контентом.
      </p>

      <div className="pill-row">
        <span className="pill">Всего материалов: {inventoryRecords.length}</span>
        <span className="pill">
          Найдено: {inventoryRecords.filter((item) => item.migrationStatus === "FOUND").length}
        </span>
        <span className="pill">
          Создано в портале:{" "}
          {inventoryRecords.filter((item) => item.migrationStatus === "CREATED_IN_PORTAL").length}
        </span>
        <span className="pill">
          Проверено: {inventoryRecords.filter((item) => item.migrationStatus === "VERIFIED").length}
        </span>
        <span className="pill">
          Не переносить: {inventoryRecords.filter((item) => item.migrationStatus === "SKIPPED").length}
        </span>
      </div>

      <div className="content-stack">
        {sectionSummary.map((entry) => (
          <div key={entry.section} className="review-card">
            <div className="review-card-header">
              <div>
                <strong>{formatLegacyContentSection(entry.section)}</strong>
                <p>
                  Всего: {entry.total}. Найдено: {entry.found}, создано в портале:{" "}
                  {entry.createdInPortal}, проверено: {entry.verified}, не переносить:{" "}
                  {entry.skipped}.
                </p>
              </div>
              <div className="pill-row">
                <span className="pill">Найдено: {entry.found}</span>
                <span className="pill">Создано в портале: {entry.createdInPortal}</span>
                <span className="pill">Проверено: {entry.verified}</span>
                <span className="pill">Не переносить: {entry.skipped}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-grid">
        <label className="field-label">
          <span>Фильтр по разделу</span>
          <select
            className="text-input"
            value={filterSection}
            onChange={(event) => {
              setFilterSection(event.target.value as LegacyContentSection | "ALL");
            }}
          >
            <option value="ALL">Все разделы</option>
            {legacySections.map((section) => (
              <option key={section} value={section}>
                {formatLegacyContentSection(section)}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          <span>Фильтр по статусу</span>
          <select
            className="text-input"
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value as LegacyContentInventoryStatus | "ALL");
            }}
          >
            <option value="ALL">Все статусы</option>
            {inventoryStatuses.map((status) => (
              <option key={status} value={status}>
                {formatLegacyContentInventoryStatus(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="content-stack">
        {visibleRecords.length > 0 ? (
          visibleRecords.map((item) => (
            <div key={item.id} className="review-card">
              <div className="review-card-header">
                <div>
                  <strong>{item.legacyTitle}</strong>
                  <p>{formatLegacyContentSection(item.legacySection)}</p>
                </div>
                <div className="pill-row">
                  <span className="pill">
                    {formatLegacyContentInventoryStatus(item.migrationStatus)}
                  </span>
                  {item.legacyDate ? (
                    <span className="pill">{formatDate(item.legacyDate)}</span>
                  ) : null}
                </div>
              </div>

              <div className="info-grid compact-grid">
                <div>
                  <strong>Источник на старом сайте</strong>
                  <p>
                    {item.legacyUrl ? (
                      <a href={item.legacyUrl} rel="noreferrer" target="_blank">
                        Открыть источник
                      </a>
                    ) : (
                      "Не указан"
                    )}
                  </p>
                </div>
                <div>
                  <strong>Связанная запись портала</strong>
                  <p>
                    {item.linkedPortalRecord
                      ? `${formatLinkedPortalEntityType(item.linkedPortalRecord.entityType)}: ${item.linkedPortalRecord.title}`
                      : "Не связана"}
                  </p>
                </div>
                <div>
                  <strong>Тип материала</strong>
                  <p>{item.legacyType ?? "Не указан"}</p>
                </div>
              </div>

              {item.migrationNote ? (
                <p className="status-note">Комментарий по переносу: {item.migrationNote}</p>
              ) : null}

              <div className="pill-row">
                <button
                  className="pill pill-button"
                  type="button"
                  onClick={() => {
                    setSelectedRecordId(item.id);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Редактировать
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="status-note">
            По выбранным фильтрам записи в реестре старого сайта не найдены.
          </p>
        )}
      </div>

      <form className="content-stack" onSubmit={handleSubmit}>
        <div className="review-card">
          <div className="review-card-header">
            <div>
              <strong>{isEditMode ? "Редактировать запись реестра" : "Новая запись реестра"}</strong>
              <p>
                Сначала зафиксируйте материал старого сайта, а затем при необходимости свяжите
                его с созданной записью портала.
              </p>
            </div>
            {isEditMode ? (
              <button
                className="pill pill-button"
                type="button"
                onClick={() => {
                  setSelectedRecordId("");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                Новая запись
              </button>
            ) : null}
          </div>

          <div className="form-grid">
            <label className="field-label">
              <span>Раздел старого сайта</span>
              <select
                className="text-input"
                value={legacySection}
                onChange={(event) => {
                  setLegacySection(event.target.value as LegacyContentSection);
                }}
                required
              >
                {legacySections.map((section) => (
                  <option key={section} value={section}>
                    {formatLegacyContentSection(section)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              <span>Статус переноса</span>
              <select
                className="text-input"
                value={migrationStatus}
                onChange={(event) => {
                  setMigrationStatus(event.target.value as LegacyContentInventoryStatus);
                }}
                required
              >
                {inventoryStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatLegacyContentInventoryStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              <span>Название материала</span>
              <input
                className="text-input"
                type="text"
                value={legacyTitle}
                onChange={(event) => {
                  setLegacyTitle(event.target.value);
                }}
                required
              />
            </label>

            <label className="field-label">
              <span>Дата материала</span>
              <input
                className="text-input"
                type="date"
                value={legacyDate}
                onChange={(event) => {
                  setLegacyDate(event.target.value);
                }}
              />
            </label>

            <label className="field-label">
              <span>Тип материала на старом сайте</span>
              <input
                className="text-input"
                type="text"
                value={legacyType}
                onChange={(event) => {
                  setLegacyType(event.target.value);
                }}
                placeholder="Например: PDF, страница, протокол"
              />
            </label>

            <label className="field-label">
              <span>Источник на старом сайте</span>
              <input
                className="text-input"
                type="url"
                value={legacyUrl}
                onChange={(event) => {
                  setLegacyUrl(event.target.value);
                }}
                placeholder="https://viam.ru/tk182/..."
              />
            </label>

            <label className="field-label" style={{ gridColumn: "1 / -1" }}>
              <span>Связанная запись портала</span>
              <select
                className="text-input"
                value={linkedPortalValue}
                onChange={(event) => {
                  setLinkedPortalValue(event.target.value);
                }}
              >
                <option value="">Не выбрана</option>
                {groupedPortalOptions.map((group) =>
                  group.items.length > 0 ? (
                    <optgroup
                      key={group.entityType}
                      label={formatLinkedPortalEntityType(group.entityType)}
                    >
                      {group.items.map((item) => (
                        <option
                          key={`${item.entityType}-${item.entityId}`}
                          value={`${item.entityType}::${item.entityId}`}
                        >
                          {item.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null
                )}
              </select>
            </label>

            <label className="field-label" style={{ gridColumn: "1 / -1" }}>
              <span>Комментарий по переносу</span>
              <textarea
                className="text-input"
                rows={4}
                value={migrationNote}
                onChange={(event) => {
                  setMigrationNote(event.target.value);
                }}
              />
            </label>
          </div>

          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          {successMessage ? <p className="status-note">{successMessage}</p> : null}

          <div className="pill-row">
            <button className="pill pill-button" disabled={isPending} type="submit">
              {isPending
                ? "Сохраняем..."
                : isEditMode
                  ? "Сохранить изменения"
                  : "Создать запись"}
            </button>
          </div>
        </div>
      </form>
    </article>
  );
}
