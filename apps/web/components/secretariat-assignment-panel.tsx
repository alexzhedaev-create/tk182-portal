"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  AuthenticatedUser,
  SecretariatReviewAssignmentRecord
} from "@tk182/shared-types";

import { extractApiErrorMessage } from "../lib/form-utils";
import { formatDateTime } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatAssignmentPanelProps {
  assignments: SecretariatReviewAssignmentRecord[];
  cycleId: string;
  participants: AuthenticatedUser[];
}

export function SecretariatAssignmentPanel({
  assignments,
  cycleId,
  participants
}: SecretariatAssignmentPanelProps) {
  const router = useRouter();
  const participantOptions = participants.filter(
    (participant) => participant.role === "PARTICIPANT" && participant.organization
  );
  const [selectedUserId, setSelectedUserId] = useState(
    participantOptions[0]?.id ?? ""
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const deferredSelectedUserId = useDeferredValue(selectedUserId);

  const selectedParticipant =
    participantOptions.find((participant) => participant.id === deferredSelectedUserId) ??
    null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedParticipant?.organization) {
      setErrorMessage("Выберите участника с привязанной организацией.");
      setIsPending(false);
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/cycles/${encodeURIComponent(cycleId)}/assignments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          userId: selectedParticipant.id,
          organizationId: selectedParticipant.organization.id
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(response, "Не удалось назначить участника.")
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage("Участник назначен на цикл согласования.");
    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="secretariat-assignment-panel">
      <h2>Назначения участников</h2>

      <div className="content-stack">
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="review-card"
              data-testid={`secretariat-assignment-${assignment.id}`}
            >
              <div className="review-card-header">
                <div>
                  <strong>{assignment.userDisplayName}</strong>
                  <p className="status-note">
                    {assignment.organizationName} • {assignment.userEmail}
                  </p>
                </div>
                <div className="pill-row">
                  <span className="pill">
                    Назначен: {formatDateTime(assignment.assignedAt)}
                  </span>
                  <span className="pill">
                    {assignment.respondedAt
                      ? `Ответил: ${formatDateTime(assignment.respondedAt)}`
                      : "Ответ еще не получен"}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>На этот цикл пока не назначено ни одного участника.</p>
        )}
      </div>

      <form
        className="form-card"
        data-testid="secretariat-assignment-create-form"
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <label className="field-label">
            <span>Участник</span>
            <select
              className="text-input"
              data-testid="secretariat-assignment-user"
              value={selectedUserId}
              onChange={(event) => {
                setSelectedUserId(event.target.value);
              }}
            >
              {participantOptions.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.displayName} • {participant.organization?.shortName}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Организация</span>
            <input
              className="text-input"
              data-testid="secretariat-assignment-organization"
              value={selectedParticipant?.organization?.name ?? "Не выбрана"}
              readOnly
            />
          </label>
        </div>

        <div className="stack-actions">
          <button
            className="pill pill-button"
            data-testid="secretariat-assignment-submit"
            type="submit"
            disabled={isPending || participantOptions.length === 0}
          >
            {isPending ? "Назначение..." : "Назначить участника"}
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
