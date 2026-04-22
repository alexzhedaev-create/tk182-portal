"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  BackofficeMeetingRecord,
  ContentMigrationStatus,
  LegacyContentSection,
  MeetingRecordCategory
} from "@tk182/shared-types";

import {
  formatLegacyContentSection,
  formatMeetingRecordCategory,
  formatMigrationStatus,
  formatPublicationStatus
} from "../lib/content";
import { extractApiErrorMessage, toDateInputValue } from "../lib/form-utils";
import { formatDate } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";
const meetingCategories: MeetingRecordCategory[] = ["MEETING_AGENDA", "MEETING_MINUTES"];
const meetingLegacySections: LegacyContentSection[] = [
  "MEETING_AGENDA",
  "MEETING_MINUTES"
];
const migrationStatuses: ContentMigrationStatus[] = ["NOT_IMPORTED", "IMPORTED", "VERIFIED"];

interface SecretariatMeetingsPanelProps {
  meetings: BackofficeMeetingRecord[];
}

export function SecretariatMeetingsPanel({ meetings }: SecretariatMeetingsPanelProps) {
  const router = useRouter();
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<MeetingRecordCategory>("MEETING_AGENDA");
  const [meetingDate, setMeetingDate] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [legacySection, setLegacySection] =
    useState<LegacyContentSection>("MEETING_AGENDA");
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

  const selectedMeeting = meetings.find((item) => item.id === selectedMeetingId) ?? null;
  const isEditMode = Boolean(selectedMeeting);
  const visibleMeetings =
    filterMigrationStatus === "ALL"
      ? meetings
      : meetings.filter(
          (item) => item.migration.migrationStatus === filterMigrationStatus
        );

  useEffect(() => {
    if (!selectedMeeting) {
      setTitle("");
      setSummary("");
      setBody("");
      setLocation("");
      setCategory("MEETING_AGENDA");
      setMeetingDate("");
      setPublicationDate("");
      setFileDescription("");
      setLegacySection("MEETING_AGENDA");
      setLegacySourceUrl("");
      setMigrationStatus("NOT_IMPORTED");
      setMigrationNote("");
      setFile(null);
      return;
    }

    setTitle(selectedMeeting.title);
    setSummary(selectedMeeting.summary);
    setBody(selectedMeeting.body);
    setLocation(selectedMeeting.location ?? "");
    setCategory(selectedMeeting.category);
    setMeetingDate(toDateInputValue(selectedMeeting.meetingDate));
    setPublicationDate(toDateInputValue(selectedMeeting.publicationDate));
    setFileDescription(selectedMeeting.attachment?.description ?? "");
    setLegacySection(selectedMeeting.migration.legacySection);
    setLegacySourceUrl(selectedMeeting.migration.legacySourceUrl ?? "");
    setMigrationStatus(selectedMeeting.migration.migrationStatus);
    setMigrationNote(selectedMeeting.migration.migrationNote ?? "");
    setFile(null);
  }, [selectedMeeting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("summary", summary);
    formData.set("body", body);
    formData.set("location", location);
    formData.set("category", category);
    formData.set("meetingDate", new Date(meetingDate).toISOString());
    formData.set("publicationDate", new Date(publicationDate).toISOString());
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
        ? `${apiBaseUrl}/meetings/backoffice/${encodeURIComponent(selectedMeeting!.id)}`
        : `${apiBaseUrl}/meetings/backoffice`,
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
            ? "Не удалось обновить запись заседания."
            : "Не удалось создать запись заседания."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      isEditMode ? "Запись заседания обновлена." : "Запись заседания создана."
    );

    if (!isEditMode) {
      setSelectedMeetingId("");
      setTitle("");
      setSummary("");
      setBody("");
      setLocation("");
      setCategory("MEETING_AGENDA");
      setMeetingDate("");
      setPublicationDate("");
      setFileDescription("");
      setLegacySection("MEETING_AGENDA");
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

  async function handleStatusChange(meetingId: string, action: "publish" | "unpublish") {
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/meetings/backoffice/${encodeURIComponent(meetingId)}/${action}`,
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
            ? "Не удалось опубликовать запись заседания."
            : "Не удалось снять запись заседания с публикации."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      action === "publish"
        ? "Запись заседания опубликована."
        : "Запись заседания снята с публикации."
    );
    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card">
      <h2>Заседания</h2>
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
            <option value="ALL">Все записи</option>
            {migrationStatuses.map((status) => (
              <option key={status} value={status}>
                {formatMigrationStatus(status)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="content-stack">
        {visibleMeetings.map((meeting) => (
          <div key={meeting.id} className="review-card">
            <div className="review-card-header">
              <div>
                <strong>{meeting.title}</strong>
                <p>{meeting.summary}</p>
              </div>
              <div className="pill-row">
                <span className="pill">{formatPublicationStatus(meeting.status)}</span>
                <span className="pill">{formatMeetingRecordCategory(meeting.category)}</span>
                <span className="pill">
                  {formatMigrationStatus(meeting.migration.migrationStatus)}
                </span>
              </div>
            </div>
            <div className="info-grid compact-grid">
              <div>
                <strong>Раздел старого сайта</strong>
                <p>{formatLegacyContentSection(meeting.migration.legacySection)}</p>
              </div>
              <div>
                <strong>Источник на старом сайте</strong>
                <p>
                  {meeting.migration.legacySourceUrl ? (
                    <a href={meeting.migration.legacySourceUrl} target="_blank" rel="noreferrer">
                      Открыть источник
                    </a>
                  ) : (
                    "Не указан"
                  )}
                </p>
              </div>
            </div>
            {meeting.migration.migrationNote ? (
              <p className="status-note">
                Комментарий по переносу: {meeting.migration.migrationNote}
              </p>
            ) : null}
            <div className="pill-row">
              <span className="pill">Дата заседания: {formatDate(meeting.meetingDate)}</span>
              <button
                className="pill pill-button"
                type="button"
                onClick={() => {
                  setSelectedMeetingId(meeting.id);
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
                    meeting.id,
                    meeting.status === "published" ? "unpublish" : "publish"
                  );
                }}
                disabled={isPending}
              >
                {meeting.status === "published" ? "Снять с публикации" : "Опубликовать"}
              </button>
              {meeting.attachment ? (
                <a
                  className="pill"
                  href={`${apiBaseUrl}/meetings/backoffice/${meeting.id}/download`}
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
              value={selectedMeetingId}
              onChange={(event) => {
                setSelectedMeetingId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новая запись заседания</option>
              {meetings.map((meeting) => (
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title}
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
                const nextCategory = event.target.value as MeetingRecordCategory;
                setCategory(nextCategory);
                setLegacySection(nextCategory as LegacyContentSection);
              }}
            >
              {meetingCategories.map((item) => (
                <option key={item} value={item}>
                  {formatMeetingRecordCategory(item)}
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
              {meetingLegacySections.map((section) => (
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

        <label className="field-label">
          <span>Название</span>
          <input
            className="text-input"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="Введите название заседания"
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
          />
        </label>

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
          <span>Содержание записи</span>
          <textarea
            className="text-area"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
            }}
          />
        </label>

        <div className="form-grid">
          <label className="field-label">
            <span>Место проведения</span>
            <input
              className="text-input"
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
              }}
              placeholder="Например, Москва, ВИАМ"
            />
          </label>

          <label className="field-label">
            <span>Дата заседания</span>
            <input
              className="text-input"
              type="date"
              value={meetingDate}
              onChange={(event) => {
                setMeetingDate(event.target.value);
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
            placeholder="Например, сверить приложения к протоколу после загрузки"
          />
        </label>

        <div className="form-grid">
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
          <span>Описание файла</span>
          <input
            className="text-input"
            value={fileDescription}
            onChange={(event) => {
              setFileDescription(event.target.value);
            }}
            placeholder="Например, PDF-протокол заседания"
          />
        </label>

        <div className="stack-actions">
          <button className="pill pill-button" type="submit" disabled={isPending}>
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Создание..."
              : isEditMode
                ? "Сохранить запись"
                : "Создать запись"}
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
