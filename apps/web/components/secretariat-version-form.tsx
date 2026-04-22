"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { extractApiErrorMessage, toDateTimeLocalValue } from "../lib/form-utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatVersionFormProps {
  draftStandardId: string;
}

export function SecretariatVersionForm({
  draftStandardId
}: SecretariatVersionFormProps) {
  const router = useRouter();
  const [versionLabel, setVersionLabel] = useState("");
  const [revisionSummary, setRevisionSummary] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [publishedAt, setPublishedAt] = useState(
    toDateTimeLocalValue(new Date().toISOString())
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/draft-standards/${encodeURIComponent(
        draftStandardId
      )}/versions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          versionLabel,
          revisionSummary,
          fileName,
          fileNote,
          publishedAt: new Date(publishedAt).toISOString()
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(response, "Не удалось создать новую версию.")
      );
      setIsPending(false);
      return;
    }

    setVersionLabel("");
    setRevisionSummary("");
    setFileName("");
    setFileNote("");
    setPublishedAt(toDateTimeLocalValue(new Date().toISOString()));
    setSuccessMessage("Новая версия проекта стандарта создана.");
    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form
      className="content-card form-card"
      data-testid="secretariat-create-version-form"
      onSubmit={handleSubmit}
    >
      <h2>Новая версия</h2>
      <div className="form-grid">
        <label className="field-label">
          <span>Обозначение версии</span>
          <input
            className="text-input"
            data-testid="secretariat-version-label"
            value={versionLabel}
            onChange={(event) => {
              setVersionLabel(event.target.value);
            }}
            placeholder="Например, Редакция 1.1"
          />
        </label>

        <label className="field-label">
          <span>Дата публикации</span>
          <input
            className="text-input"
            data-testid="secretariat-version-published-at"
            type="datetime-local"
            value={publishedAt}
            onChange={(event) => {
              setPublishedAt(event.target.value);
            }}
          />
        </label>
      </div>

      <label className="field-label">
        <span>Описание изменений</span>
        <textarea
          className="text-area"
          data-testid="secretariat-version-revision-summary"
          value={revisionSummary}
          onChange={(event) => {
            setRevisionSummary(event.target.value);
          }}
          placeholder="Кратко опишите, что изменилось в новой редакции"
        />
      </label>

      <div className="form-grid">
        <label className="field-label">
          <span>Имя основного файла версии</span>
          <input
            className="text-input"
            data-testid="secretariat-version-file-name"
            value={fileName}
            onChange={(event) => {
              setFileName(event.target.value);
            }}
            placeholder="Например, tk182-draft-v1_1.docx"
          />
        </label>

        <label className="field-label">
          <span>Описание файла</span>
          <input
            className="text-input"
            data-testid="secretariat-version-file-note"
            value={fileNote}
            onChange={(event) => {
              setFileNote(event.target.value);
            }}
            placeholder="Например, Основной текст для согласования"
          />
        </label>
      </div>

      <div className="stack-actions">
        <button
          className="pill pill-button"
          data-testid="secretariat-version-submit"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Создание..." : "Создать версию"}
        </button>
      </div>

      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? <p className="status-note">{successMessage}</p> : null}
    </form>
  );
}
