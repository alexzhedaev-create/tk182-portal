"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  SecretariatDraftStandardVersionRecord,
  SecretariatReviewCycleListItem
} from "@tk182/shared-types";

import { extractApiErrorMessage, toDateTimeLocalValue } from "../lib/form-utils";
import { formatReviewCycleStatus } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatCycleManagementPanelProps {
  cycleId: string;
  currentCycle: SecretariatReviewCycleListItem;
  description: string;
  versions: SecretariatDraftStandardVersionRecord[];
}

export function SecretariatCycleManagementPanel({
  cycleId,
  currentCycle,
  description,
  versions
}: SecretariatCycleManagementPanelProps) {
  const router = useRouter();
  const [draftStandardVersionId, setDraftStandardVersionId] = useState(
    currentCycle.currentVersion.id
  );
  const [title, setTitle] = useState(currentCycle.cycle.title);
  const [cycleDescription, setCycleDescription] = useState(description);
  const [opensAt, setOpensAt] = useState(
    toDateTimeLocalValue(currentCycle.cycle.opensAt)
  );
  const [deadlineAt, setDeadlineAt] = useState(
    toDateTimeLocalValue(currentCycle.cycle.deadlineAt)
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function refreshAfterSuccess(message: string) {
    setSuccessMessage(message);
    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/cycles/${encodeURIComponent(cycleId)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          draftStandardVersionId,
          title,
          description: cycleDescription,
          opensAt: new Date(opensAt).toISOString(),
          deadlineAt: new Date(deadlineAt).toISOString()
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(response, "Не удалось обновить параметры цикла.")
      );
      setIsPending(false);
      return;
    }

    void response.json().catch(() => null);
    await refreshAfterSuccess("Параметры цикла сохранены.");
  }

  async function handleTransition(action: "activate" | "close") {
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/cycles/${encodeURIComponent(
        cycleId
      )}/${action}`,
      {
        method: "POST",
        credentials: "include"
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          action === "activate"
            ? "Не удалось открыть цикл."
            : "Не удалось закрыть цикл."
        )
      );
      setIsPending(false);
      return;
    }

    void response.json().catch(() => null);
    await refreshAfterSuccess(
      action === "activate" ? "Цикл открыт для участников." : "Цикл закрыт."
    );
  }

  return (
    <form
      className="content-card form-card"
      data-testid="secretariat-cycle-management-form"
      onSubmit={handleSave}
    >
      <h2>Параметры цикла</h2>
      <div className="pill-row">
        <span className="pill">
          Статус: {formatReviewCycleStatus(currentCycle.cycle.status)}
        </span>
        <span className="pill">
          Версия: {currentCycle.currentVersion.versionLabel}
        </span>
      </div>

      <div className="form-grid">
        <label className="field-label">
          <span>Название цикла</span>
          <input
            className="text-input"
            data-testid="secretariat-cycle-management-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </label>

        <label className="field-label">
          <span>Статус цикла</span>
          <input
            className="text-input"
            value={formatReviewCycleStatus(currentCycle.cycle.status)}
            readOnly
          />
        </label>
      </div>

      <label className="field-label">
        <span>Описание цикла</span>
        <textarea
          className="text-area"
          data-testid="secretariat-cycle-management-description"
          value={cycleDescription}
          onChange={(event) => {
            setCycleDescription(event.target.value);
          }}
        />
      </label>

      <div className="form-grid">
        <label className="field-label">
          <span>Версия проекта стандарта</span>
          <select
            className="text-input"
            data-testid="secretariat-cycle-management-version"
            value={draftStandardVersionId}
            onChange={(event) => {
              setDraftStandardVersionId(event.target.value);
            }}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.versionLabel} • {version.fileName}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          <span>Дата начала</span>
          <input
            className="text-input"
            data-testid="secretariat-cycle-management-opens-at"
            type="datetime-local"
            value={opensAt}
            onChange={(event) => {
              setOpensAt(event.target.value);
            }}
          />
        </label>
      </div>

      <label className="field-label">
        <span>Срок согласования</span>
        <input
          className="text-input"
          data-testid="secretariat-cycle-management-deadline-at"
          type="datetime-local"
          value={deadlineAt}
          onChange={(event) => {
            setDeadlineAt(event.target.value);
          }}
        />
      </label>

      <div className="stack-actions">
        <button
          className="pill pill-button"
          data-testid="secretariat-cycle-management-save"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Сохранение..." : "Сохранить параметры"}
        </button>

        {currentCycle.cycle.status === "draft" ? (
          <button
            className="pill pill-button"
            data-testid="secretariat-cycle-management-activate"
            type="button"
            disabled={isPending}
            onClick={() => {
              void handleTransition("activate");
            }}
          >
            Открыть цикл
          </button>
        ) : null}

        {currentCycle.cycle.status !== "closed" ? (
          <button
            className="pill pill-button"
            data-testid="secretariat-cycle-management-close"
            type="button"
            disabled={isPending}
            onClick={() => {
              void handleTransition("close");
            }}
          >
            Закрыть цикл
          </button>
        ) : null}
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
