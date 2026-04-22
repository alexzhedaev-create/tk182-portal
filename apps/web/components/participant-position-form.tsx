"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type { ParticipantPositionRecord, ParticipantPositionValue } from "@tk182/shared-types";

import { formatDateTime, formatParticipantPosition } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

const positionOptions: ParticipantPositionValue[] = [
  "AGREED",
  "AGREED_WITH_COMMENTS",
  "NOT_AGREED"
];

interface ParticipantPositionFormProps {
  canSubmit: boolean;
  cycleId: string;
  currentPosition: ParticipantPositionRecord | null;
}

export function ParticipantPositionForm({
  canSubmit,
  cycleId,
  currentPosition
}: ParticipantPositionFormProps) {
  const router = useRouter();
  const [position, setPosition] = useState<ParticipantPositionValue>(
    currentPosition?.position ?? "AGREED_WITH_COMMENTS"
  );
  const [note, setNote] = useState(currentPosition?.note ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const response = await fetch(
      `${apiBaseUrl}/approval/participant/cycles/${encodeURIComponent(cycleId)}/position`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          position,
          note: note || null
        })
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setErrorMessage(payload?.message ?? "Не удалось отправить итоговую позицию.");
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="participant-position-panel">
      <h2>Итоговая позиция</h2>

      {currentPosition ? (
        <div className="review-card">
          <strong>{formatParticipantPosition(currentPosition.position)}</strong>
          <p className="status-note">
            Отправлено: {formatDateTime(currentPosition.submittedAt)}. Автор:{" "}
            {currentPosition.submittedByName}.
          </p>
          {currentPosition.note ? <p>{currentPosition.note}</p> : null}
        </div>
      ) : (
        <p>Итоговая позиция еще не отправлена.</p>
      )}

      {canSubmit ? (
        <form
          className="content-stack"
          data-testid="participant-position-form"
          onSubmit={handleSubmit}
        >
          <div className="radio-group">
            {positionOptions.map((option) => (
              <label key={option} className="radio-card">
                <input
                  type="radio"
                  name="participant-position"
                  value={option}
                  checked={position === option}
                  onChange={() => {
                    setPosition(option);
                  }}
                />
                <span>{formatParticipantPosition(option)}</span>
              </label>
            ))}
          </div>

          <label className="field-label">
            <span>Комментарий к итоговой позиции</span>
            <textarea
              className="text-area"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
              placeholder="При необходимости укажите сводный комментарий по позиции организации"
            />
          </label>

          <div className="stack-actions">
            <button
              className="pill pill-button"
              data-testid="participant-position-submit"
              type="submit"
              disabled={isPending}
            >
              {isPending
                ? "Отправка..."
                : currentPosition
                  ? "Обновить итоговую позицию"
                  : "Отправить итоговую позицию"}
            </button>
          </div>

          {errorMessage ? (
            <p className="status-note status-note-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="status-note">
          Изменение итоговой позиции недоступно после закрытия цикла.
        </p>
      )}
    </article>
  );
}
