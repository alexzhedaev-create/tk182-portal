"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { MeetingRecord, MeetingRecordCategory } from "@tk182/shared-types";

import { formatMeetingRecordCategory, formatPublicationStatus } from "../lib/content";
import { extractApiErrorMessage, toDateInputValue } from "../lib/form-utils";
import { formatDate } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";
const meetingCategories: MeetingRecordCategory[] = ["MEETING_AGENDA", "MEETING_MINUTES"];

interface SecretariatMeetingsPanelProps {
  meetings: MeetingRecord[];
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
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedMeeting = meetings.find((item) => item.id === selectedMeetingId) ?? null;
  const isEditMode = Boolean(selectedMeeting);

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
      <div className="content-stack">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="review-card">
            <div className="review-card-header">
              <div>
                <strong>{meeting.title}</strong>
                <p>{meeting.summary}</p>
              </div>
              <div className="pill-row">
                <span className="pill">{formatPublicationStatus(meeting.status)}</span>
                <span className="pill">{formatMeetingRecordCategory(meeting.category)}</span>
              </div>
            </div>
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
                setCategory(event.target.value as MeetingRecordCategory);
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
