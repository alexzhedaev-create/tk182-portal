"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { SecretariatDraftStandardVersionRecord } from "@tk182/shared-types";

import { extractApiErrorMessage, toDateTimeLocalValue } from "../lib/form-utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatCycleFormProps {
  draftStandardId: string;
  versions: SecretariatDraftStandardVersionRecord[];
}

export function SecretariatCycleForm({
  draftStandardId,
  versions
}: SecretariatCycleFormProps) {
  const router = useRouter();
  const [draftStandardVersionId, setDraftStandardVersionId] = useState(
    versions[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [deadlineAt, setDeadlineAt] = useState(
    toDateTimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const firstVersion = versions[0];

    if (versions.length < 1) {
      setDraftStandardVersionId("");
      return;
    }

    if (firstVersion && !versions.some((version) => version.id === draftStandardVersionId)) {
      setDraftStandardVersionId(firstVersion.id);
    }
  }, [draftStandardVersionId, versions]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/draft-standards/${encodeURIComponent(
        draftStandardId
      )}/cycles`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          draftStandardVersionId,
          title,
          description,
          opensAt: new Date(opensAt).toISOString(),
          deadlineAt: new Date(deadlineAt).toISOString()
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          "Не удалось создать новый цикл согласования."
        )
      );
      setIsPending(false);
      return;
    }

    const payload = (await response.json()) as {
      cycle: {
        cycle: {
          id: string;
        };
      };
    };

    router.push(`/secretariat/cycles/${payload.cycle.cycle.id}`);
    router.refresh();
  }

  return (
    <form
      className="content-card form-card"
      data-testid="secretariat-create-cycle-form"
      onSubmit={handleSubmit}
    >
      <h2>Новый цикл согласования</h2>

      {versions.length > 0 ? (
        <>
          <label className="field-label">
            <span>Версия проекта стандарта</span>
            <select
              className="text-input"
              data-testid="secretariat-cycle-version"
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
            <span>Название цикла</span>
            <input
              className="text-input"
              data-testid="secretariat-cycle-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder="Например, Основной цикл согласования"
            />
          </label>

          <label className="field-label">
            <span>Описание цикла</span>
            <textarea
              className="text-area"
              data-testid="secretariat-cycle-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="Опишите цель цикла и ожидаемый состав отзывов"
            />
          </label>

          <div className="form-grid">
            <label className="field-label">
              <span>Дата начала</span>
              <input
                className="text-input"
                data-testid="secretariat-cycle-opens-at"
                type="datetime-local"
                value={opensAt}
                onChange={(event) => {
                  setOpensAt(event.target.value);
                }}
              />
            </label>

            <label className="field-label">
              <span>Срок согласования</span>
              <input
                className="text-input"
                data-testid="secretariat-cycle-deadline-at"
                type="datetime-local"
                value={deadlineAt}
                onChange={(event) => {
                  setDeadlineAt(event.target.value);
                }}
              />
            </label>
          </div>

          <div className="stack-actions">
            <button
              className="pill pill-button"
              data-testid="secretariat-cycle-submit"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Создание..." : "Создать цикл"}
            </button>
          </div>
        </>
      ) : (
        <p>Сначала создайте хотя бы одну версию проекта стандарта.</p>
      )}

      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
