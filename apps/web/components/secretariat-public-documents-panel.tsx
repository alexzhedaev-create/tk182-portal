"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  BackofficePublicDocumentRecord,
  ContentMigrationStatus,
  LegacyContentSection,
  PublicDocumentCategory
} from "@tk182/shared-types";

import {
  formatLegacyContentSection,
  formatMigrationStatus,
  formatPublicDocumentCategory,
  formatPublicationStatus
} from "../lib/content";
import { extractApiErrorMessage, toDateInputValue } from "../lib/form-utils";
import { formatFileSize, formatOptionalDate } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";
const documentCategories: PublicDocumentCategory[] = [
  "MAIN_DOCUMENTS",
  "WORK_REPORTS",
  "WORK_PLANS",
  "NATIONAL_STANDARDS_PROGRAM"
];
const documentLegacySections: LegacyContentSection[] = [
  "MAIN_DOCUMENTS",
  "WORK_REPORTS",
  "WORK_PLANS",
  "NATIONAL_STANDARDS_PROGRAM"
];
const migrationStatuses: ContentMigrationStatus[] = ["NOT_IMPORTED", "IMPORTED", "VERIFIED"];

interface SecretariatPublicDocumentsPanelProps {
  documents: BackofficePublicDocumentRecord[];
}

export function SecretariatPublicDocumentsPanel({
  documents
}: SecretariatPublicDocumentsPanelProps) {
  const router = useRouter();
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<PublicDocumentCategory>("MAIN_DOCUMENTS");
  const [publicationDate, setPublicationDate] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [legacySection, setLegacySection] =
    useState<LegacyContentSection>("MAIN_DOCUMENTS");
  const [legacySourceUrl, setLegacySourceUrl] = useState("");
  const [migrationStatus, setMigrationStatus] =
    useState<ContentMigrationStatus>("NOT_IMPORTED");
  const [migrationNote, setMigrationNote] = useState("");
  const [filterMigrationStatus, setFilterMigrationStatus] = useState<
    ContentMigrationStatus | "ALL"
  >("ALL");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedDocument =
    documents.find((item) => item.id === selectedDocumentId) ?? null;
  const isEditMode = Boolean(selectedDocument);
  const visibleDocuments =
    filterMigrationStatus === "ALL"
      ? documents
      : documents.filter(
          (item) => item.migration.migrationStatus === filterMigrationStatus
        );

  useEffect(() => {
    if (!selectedDocument) {
      setTitle("");
      setSummary("");
      setBody("");
      setCategory("MAIN_DOCUMENTS");
      setPublicationDate("");
      setFileDescription("");
      setLegacySection("MAIN_DOCUMENTS");
      setLegacySourceUrl("");
      setMigrationStatus("NOT_IMPORTED");
      setMigrationNote("");
      setFile(null);
      return;
    }

    setTitle(selectedDocument.title);
    setSummary(selectedDocument.summary);
    setBody(selectedDocument.body ?? "");
    setCategory(selectedDocument.category);
    setPublicationDate(toDateInputValue(selectedDocument.publicationDate));
    setFileDescription(selectedDocument.attachment?.description ?? "");
    setLegacySection(selectedDocument.migration.legacySection);
    setLegacySourceUrl(selectedDocument.migration.legacySourceUrl ?? "");
    setMigrationStatus(selectedDocument.migration.migrationStatus);
    setMigrationNote(selectedDocument.migration.migrationNote ?? "");
    setFile(null);
  }, [selectedDocument]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("summary", summary);
    formData.set("body", body);
    formData.set("category", category);
    formData.set(
      "publicationDate",
      publicationDate ? new Date(publicationDate).toISOString() : ""
    );
    formData.set("fileDescription", fileDescription);
    formData.set("legacySection", legacySection);
    formData.set("legacySourceUrl", legacySourceUrl);
    formData.set("migrationStatus", migrationStatus);
    formData.set("migrationNote", migrationNote);

    if (file) {
      formData.set("file", file);
    }

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/documents/backoffice/${encodeURIComponent(selectedDocument!.id)}`
        : `${apiBaseUrl}/documents/backoffice`,
      {
        method: isEditMode ? "PATCH" : "POST",
        credentials: "include",
        body: formData
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить документ."
            : "Не удалось создать документ."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(isEditMode ? "Документ обновлен." : "Документ создан.");

    if (!isEditMode) {
      setSelectedDocumentId("");
      setTitle("");
      setSummary("");
      setBody("");
      setCategory("MAIN_DOCUMENTS");
      setPublicationDate("");
      setFileDescription("");
      setLegacySection("MAIN_DOCUMENTS");
      setLegacySourceUrl("");
      setMigrationStatus("NOT_IMPORTED");
      setMigrationNote("");
      setFile(null);
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleStatusChange(documentId: string, action: "publish" | "unpublish") {
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/documents/backoffice/${encodeURIComponent(documentId)}/${action}`,
      {
        method: "POST",
        credentials: "include"
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          action === "publish"
            ? "Не удалось опубликовать документ."
            : "Не удалось снять документ с публикации."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      action === "publish" ? "Документ опубликован." : "Документ снят с публикации."
    );
    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="secretariat-public-documents-panel">
      <h2>Публичные документы</h2>
      <p className="status-note">
        Раздел поддерживает категории старого сайта: основные документы, отчеты,
        планы и программу разработки национальных стандартов.
      </p>
      <div className="form-grid">
        <label className="field-label">
          <span>Фильтр по статусу переноса</span>
          <select
            className="text-input"
            value={filterMigrationStatus}
            onChange={(event) => {
              setFilterMigrationStatus(
                event.target.value as ContentMigrationStatus | "ALL"
              );
            }}
          >
            <option value="ALL">Все документы</option>
            {migrationStatuses.map((status) => (
              <option key={status} value={status}>
                {formatMigrationStatus(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="content-stack">
        {visibleDocuments.map((document) => (
          <div key={document.id} className="review-card">
            <div className="review-card-header">
              <div>
                <strong>{document.title}</strong>
                <p>{document.summary}</p>
              </div>
              <div className="pill-row">
                <span className="pill">{formatPublicationStatus(document.status)}</span>
                <span className="pill">{formatPublicDocumentCategory(document.category)}</span>
                <span className="pill">
                  {formatMigrationStatus(document.migration.migrationStatus)}
                </span>
              </div>
            </div>

            <div className="info-grid compact-grid">
              <div>
                <strong>Дата публикации</strong>
                <p>
                  {formatOptionalDate(
                    document.publicationDate,
                    "Дата на старом сайте не указана"
                  )}
                </p>
              </div>
              <div>
                <strong>Файл</strong>
                <p>{document.attachment?.originalName ?? "Файл не загружен"}</p>
              </div>
              <div>
                <strong>Размер</strong>
                <p>
                  {document.attachment
                    ? formatFileSize(document.attachment.sizeBytes)
                    : "—"}
                </p>
              </div>
              <div>
                <strong>Раздел старого сайта</strong>
                <p>{formatLegacyContentSection(document.migration.legacySection)}</p>
              </div>
              <div>
                <strong>Источник на старом сайте</strong>
                <p>
                  {document.migration.legacySourceUrl ? (
                    <a
                      href={document.migration.legacySourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Открыть источник
                    </a>
                  ) : (
                    "Не указан"
                  )}
                </p>
              </div>
            </div>
            {document.migration.migrationNote ? (
              <p className="status-note">
                Комментарий по переносу: {document.migration.migrationNote}
              </p>
            ) : null}

            <div className="pill-row">
              <button
                className="pill pill-button"
                type="button"
                onClick={() => {
                  setSelectedDocumentId(document.id);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                Редактировать
              </button>
              <button
                className="pill pill-button"
                type="button"
                onClick={() => {
                  void handleStatusChange(
                    document.id,
                    document.status === "published" ? "unpublish" : "publish"
                  );
                }}
                disabled={isPending}
              >
                {document.status === "published" ? "Снять с публикации" : "Опубликовать"}
              </button>
              {document.attachment ? (
                <a
                  className="pill"
                  href={`${apiBaseUrl}/documents/backoffice/${document.id}/download`}
                >
                  Скачать файл
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field-label">
            <span>Режим формы</span>
            <select
              className="text-input"
              value={selectedDocumentId}
              onChange={(event) => {
                setSelectedDocumentId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новый документ</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Категория</span>
            <select
              className="text-input"
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value as PublicDocumentCategory;
                setCategory(nextCategory);
                setLegacySection(nextCategory as LegacyContentSection);
              }}
            >
              {documentCategories.map((item) => (
                <option key={item} value={item}>
                  {formatPublicDocumentCategory(item)}
                </option>
              ))}
            </select>
          </label>
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
            >
              {documentLegacySections.map((section) => (
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
                setMigrationStatus(event.target.value as ContentMigrationStatus);
              }}
            >
              {migrationStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatMigrationStatus(status)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label className="field-label">
            <span>Заголовок</span>
            <input
              className="text-input"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder="Введите заголовок документа"
            />
          </label>

          <label className="field-label">
            <span>Дата публикации</span>
            <input
              className="text-input"
              type="date"
              value={publicationDate}
              onChange={(event) => {
                setPublicationDate(event.target.value);
              }}
            />
          </label>
        </div>

        <label className="field-label">
          <span>Источник на старом сайте</span>
          <input
            className="text-input"
            value={legacySourceUrl}
            onChange={(event) => {
              setLegacySourceUrl(event.target.value);
            }}
            placeholder="https://viam.ru/tk182/..."
          />
        </label>

        <label className="field-label">
          <span>Краткое описание</span>
          <textarea
            className="text-area"
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
            }}
            placeholder="Кратко опишите содержание и назначение документа"
          />
        </label>

        <label className="field-label">
          <span>Содержимое документа</span>
          <textarea
            className="text-area"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
            }}
            placeholder="Текст публикации, таблица программы или иное содержимое документа"
          />
        </label>

        <div className="form-grid">
          <label className="field-label">
            <span>Описание файла</span>
            <input
              className="text-input"
              value={fileDescription}
              onChange={(event) => {
                setFileDescription(event.target.value);
              }}
              placeholder="Например, PDF-версия утвержденного документа"
            />
          </label>

          <label className="field-label">
            <span>Файл</span>
            <input
              className="text-input"
              type="file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>
        </div>

        <label className="field-label">
          <span>Комментарий по переносу</span>
          <textarea
            className="text-area"
            value={migrationNote}
            onChange={(event) => {
              setMigrationNote(event.target.value);
            }}
            placeholder="Например, проверить вложения и форматирование после переноса"
          />
        </label>

        {selectedDocument?.attachment ? (
          <p className="status-note">
            Текущий файл: {selectedDocument.attachment.originalName}
          </p>
        ) : null}

        <div className="stack-actions">
          <button className="pill pill-button" type="submit" disabled={isPending}>
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Создание..."
              : isEditMode
                ? "Сохранить документ"
                : "Создать документ"}
          </button>
        </div>

        {errorMessage ? (
          <p className="status-note status-note-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? <p className="status-note">{successMessage}</p> : null}
      </form>
    </article>
  );
}
