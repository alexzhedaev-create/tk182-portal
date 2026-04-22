"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  SecretariatDraftStandardRecord,
  SubcommitteeSummary
} from "@tk182/shared-types";

import { extractApiErrorMessage } from "../lib/form-utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatDraftStandardFormProps {
  draftStandard?: SecretariatDraftStandardRecord;
  subcommittees: SubcommitteeSummary[];
}

export function SecretariatDraftStandardForm({
  draftStandard,
  subcommittees
}: SecretariatDraftStandardFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(draftStandard?.code ?? "");
  const [title, setTitle] = useState(draftStandard?.title ?? "");
  const [summary, setSummary] = useState(draftStandard?.summary ?? "");
  const [stage, setStage] = useState(draftStandard?.stage ?? "Подготовка");
  const [responsibleSubcommitteeId, setResponsibleSubcommitteeId] = useState(
    draftStandard?.responsibleSubcommittee?.id ?? subcommittees[0]?.id ?? ""
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditMode = Boolean(draftStandard);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/approval/secretariat/draft-standards/${encodeURIComponent(
            draftStandard!.id
          )}`
        : `${apiBaseUrl}/approval/secretariat/draft-standards`,
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          code,
          title,
          summary,
          stage,
          responsibleSubcommitteeId
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить проект стандарта."
            : "Не удалось создать проект стандарта."
        )
      );
      setIsPending(false);
      return;
    }

    const payload = (await response.json()) as {
      draftStandard: SecretariatDraftStandardRecord;
    };

    if (isEditMode) {
      setSuccessMessage("Сведения о проекте стандарта обновлены.");
      setIsPending(false);
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    router.push(`/secretariat/projects/${payload.draftStandard.id}`);
    router.refresh();
  }

  return (
    <form
      className="content-card form-card"
      data-testid={
        isEditMode
          ? "secretariat-edit-draft-standard-form"
          : "secretariat-create-draft-standard-form"
      }
      onSubmit={handleSubmit}
    >
      <h2>{isEditMode ? "Параметры проекта стандарта" : "Новый проект стандарта"}</h2>
      <div className="form-grid">
        <label className="field-label">
          <span>Код проекта</span>
          <input
            className="text-input"
            data-testid="secretariat-draft-standard-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
            }}
            placeholder="Например, ТК182-03-2026"
          />
        </label>

        <label className="field-label">
          <span>Стадия</span>
          <input
            className="text-input"
            data-testid="secretariat-draft-standard-stage"
            value={stage}
            onChange={(event) => {
              setStage(event.target.value);
            }}
            placeholder="Например, Подготовка"
          />
        </label>

        <label className="field-label">
          <span>Ответственный подкомитет</span>
          <select
            className="text-input"
            data-testid="secretariat-draft-standard-subcommittee"
            value={responsibleSubcommitteeId}
            onChange={(event) => {
              setResponsibleSubcommitteeId(event.target.value);
            }}
          >
            {subcommittees.map((subcommittee) => (
              <option key={subcommittee.id} value={subcommittee.id}>
                {subcommittee.code} — {subcommittee.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {draftStandard?.responsibleSubcommittee ? (
        <p className="status-note">
          Текущий ответственный подкомитет: {draftStandard.responsibleSubcommittee.code} —{" "}
          {draftStandard.responsibleSubcommittee.title}
        </p>
      ) : null}

      <label className="field-label">
        <span>Название проекта стандарта</span>
        <input
          className="text-input"
          data-testid="secretariat-draft-standard-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          placeholder="Введите рабочее название проекта стандарта"
        />
      </label>

      <label className="field-label">
        <span>Краткое описание</span>
        <textarea
          className="text-area"
          data-testid="secretariat-draft-standard-summary"
          value={summary}
          onChange={(event) => {
            setSummary(event.target.value);
          }}
          placeholder="Кратко опишите предмет и цель проекта стандарта"
        />
      </label>

      <div className="stack-actions">
        <button
          className="pill pill-button"
          data-testid="secretariat-draft-standard-submit"
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? isEditMode
              ? "Сохранение..."
              : "Создание..."
            : isEditMode
              ? "Сохранить изменения"
              : "Создать проект стандарта"}
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
