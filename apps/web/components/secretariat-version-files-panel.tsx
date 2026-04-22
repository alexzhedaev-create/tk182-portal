"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  ReviewAttachmentSummary,
  ReviewFileVisibility
} from "@tk182/shared-types";

import {
  formatDateTime,
  formatFileSize,
  formatReviewFileVisibility
} from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

const visibilityOptions: ReviewFileVisibility[] = [
  "ASSIGNED_PARTICIPANTS",
  "SECRETARIAT_ONLY"
];

interface SecretariatVersionFilesPanelProps {
  files: ReviewAttachmentSummary[];
  versionId: string;
}

interface VersionFileItemProps {
  file: ReviewAttachmentSummary;
}

function SecretariatVersionFileItem({ file }: VersionFileItemProps) {
  const router = useRouter();
  const [description, setDescription] = useState(file.description ?? "");
  const [visibility, setVisibility] = useState<ReviewFileVisibility>(file.visibility);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/files/${encodeURIComponent(file.id)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          description: description || null,
          visibility
        })
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setErrorMessage(payload?.message ?? "Не удалось обновить сведения о файле.");
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(): Promise<void> {
    const confirmed = window.confirm("Удалить файл версии?");

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/files/${encodeURIComponent(file.id)}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setErrorMessage(payload?.message ?? "Не удалось удалить файл.");
      setIsDeleting(false);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form
      className="review-card content-stack"
      data-testid={`secretariat-version-file-${file.id}`}
      onSubmit={handleSave}
    >
      <div className="review-card-header">
        <div>
          <strong>{file.originalName}</strong>
          <p className="status-note">
            Загружен: {formatDateTime(file.uploadedAt)}
            {file.uploadedByDisplayName ? ` • ${file.uploadedByDisplayName}` : ""}
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">{formatFileSize(file.sizeBytes)}</span>
          <span className="pill">{formatReviewFileVisibility(file.visibility)}</span>
          <a
            className="pill"
            href={`${apiBaseUrl}/approval/secretariat/files/${encodeURIComponent(
              file.id
            )}/download`}
          >
            Скачать
          </a>
        </div>
      </div>

      <div className="form-grid compact-grid">
        <label className="field-label">
          <span>Видимость</span>
          <select
            className="text-input"
            data-testid={`secretariat-version-file-visibility-${file.id}`}
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value as ReviewFileVisibility);
            }}
          >
            {visibilityOptions.map((option) => (
              <option key={option} value={option}>
                {formatReviewFileVisibility(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          <span>Тип файла</span>
          <input className="text-input" value={file.mimeType} readOnly />
        </label>
      </div>

      <label className="field-label">
        <span>Описание</span>
        <textarea
          className="text-area file-description-area"
          data-testid={`secretariat-version-file-description-${file.id}`}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
          placeholder="Кратко опишите назначение файла"
        />
      </label>

      <div className="stack-actions">
        <button
          className="pill pill-button"
          data-testid={`secretariat-version-file-save-${file.id}`}
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Сохранение..." : "Сохранить изменения"}
        </button>
        <button
          className="pill pill-button"
          data-testid={`secretariat-version-file-delete-${file.id}`}
          type="button"
          disabled={isDeleting}
          onClick={() => {
            void handleDelete();
          }}
        >
          {isDeleting ? "Удаление..." : "Удалить"}
        </button>
      </div>

      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}

export function SecretariatVersionFilesPanel({
  files,
  versionId
}: SecretariatVersionFilesPanelProps) {
  const router = useRouter();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadVisibility, setUploadVisibility] =
    useState<ReviewFileVisibility>("ASSIGNED_PARTICIPANTS");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);

    if (!selectedFile) {
      setUploadError("Выберите файл для загрузки.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("description", uploadDescription);
    formData.set("visibility", uploadVisibility);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/versions/${encodeURIComponent(versionId)}/files`,
      {
        method: "POST",
        credentials: "include",
        body: formData
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setUploadError(payload?.message ?? "Не удалось загрузить файл версии.");
      setIsUploading(false);
      return;
    }

    setSelectedFile(null);
    setUploadDescription("");
    setUploadVisibility("ASSIGNED_PARTICIPANTS");
    setFormKey((current) => current + 1);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card">
      <h2>Файлы версии</h2>

      <form
        key={formKey}
        className="form-card"
        data-testid="secretariat-version-files-upload-form"
        onSubmit={handleUpload}
      >
        <div className="form-grid">
          <label className="field-label">
            <span>Файл</span>
            <input
              className="text-input file-input"
              data-testid="secretariat-upload-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.zip,.txt"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>

          <label className="field-label">
            <span>Видимость</span>
            <select
              className="text-input"
              data-testid="secretariat-upload-visibility"
              value={uploadVisibility}
              onChange={(event) => {
                setUploadVisibility(event.target.value as ReviewFileVisibility);
              }}
            >
              {visibilityOptions.map((option) => (
                <option key={option} value={option}>
                  {formatReviewFileVisibility(option)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field-label">
          <span>Описание</span>
          <textarea
            className="text-area file-description-area"
            data-testid="secretariat-upload-description"
            value={uploadDescription}
            onChange={(event) => {
              setUploadDescription(event.target.value);
            }}
            placeholder="Например: пояснительная записка или форма замечаний"
          />
        </label>

        <div className="stack-actions">
          <button
            className="pill pill-button"
            data-testid="secretariat-upload-submit"
            type="submit"
            disabled={isUploading}
          >
            {isUploading ? "Загрузка..." : "Загрузить файл"}
          </button>
          <span className="status-note">
            Разрешены PDF, DOC, DOCX, XLSX, ZIP и TXT.
          </span>
        </div>

        {uploadError ? (
          <p className="status-note status-note-error" role="alert">
            {uploadError}
          </p>
        ) : null}
      </form>

      <div className="content-stack">
        {files.length > 0 ? (
          files.map((file) => <SecretariatVersionFileItem key={file.id} file={file} />)
        ) : (
          <p>Файлы для этой версии пока не загружены.</p>
        )}
      </div>
    </article>
  );
}
