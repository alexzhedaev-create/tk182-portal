"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CommitteeEditableOrganizationRecord,
  CommitteeEditablePersonRecord
} from "@tk182/shared-types";

import { extractApiErrorMessage } from "../lib/form-utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatCommitteePeoplePanelProps {
  organizations: CommitteeEditableOrganizationRecord[];
  people: CommitteeEditablePersonRecord[];
}

export function SecretariatCommitteePeoplePanel({
  organizations,
  people
}: SecretariatCommitteePeoplePanelProps) {
  const router = useRouter();
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? null;

  useEffect(() => {
    if (!selectedPerson) {
      setFullName("");
      setJobTitle("");
      setOrganizationId("");
      return;
    }

    setFullName(selectedPerson.fullName);
    setJobTitle(selectedPerson.jobTitle);
    setOrganizationId(selectedPerson.organizationId ?? "");
  }, [selectedPerson]);

  const isEditMode = Boolean(selectedPerson);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/committee/backoffice/people/${encodeURIComponent(
            selectedPerson!.id
          )}`
        : `${apiBaseUrl}/committee/backoffice/people`,
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          jobTitle,
          organizationId: organizationId || null
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить сведения о представителе."
            : "Не удалось создать карточку представителя."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      isEditMode
        ? "Сведения о представителе обновлены."
        : "Карточка представителя создана."
    );

    if (!isEditMode) {
      setSelectedPersonId("");
      setFullName("");
      setJobTitle("");
      setOrganizationId("");
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="secretariat-committee-people-panel">
      <h2>Руководство и секретариат: представители</h2>
      <div className="content-stack">
        {people.map((person) => (
          <div
            key={person.id}
            className="review-card"
            data-testid={`secretariat-committee-person-card-${person.id}`}
          >
            <div className="review-card-header">
              <div>
                <strong>{person.fullName}</strong>
                <p>{person.jobTitle}</p>
              </div>
              <span className="pill">
                {person.organization?.shortName ?? "Организация не указана"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <form
        className="form-card"
        data-testid="secretariat-committee-person-form"
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <label className="field-label">
            <span>Режим формы</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-person-edit-select"
              value={selectedPersonId}
              onChange={(event) => {
                setSelectedPersonId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новый представитель</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Организация</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-person-organization"
              value={organizationId}
              onChange={(event) => {
                setOrganizationId(event.target.value);
              }}
            >
              <option value="">Без привязки к организации</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field-label">
          <span>ФИО</span>
          <input
            className="text-input"
            data-testid="secretariat-committee-person-full-name"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
            }}
            placeholder="Введите ФИО представителя"
          />
        </label>

        <label className="field-label">
          <span>Должность</span>
          <textarea
            className="text-area"
            data-testid="secretariat-committee-person-job-title"
            value={jobTitle}
            onChange={(event) => {
              setJobTitle(event.target.value);
            }}
            placeholder="Введите должность представителя"
          />
        </label>

        <div className="stack-actions">
          <button
            className="pill pill-button"
            data-testid="secretariat-committee-person-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Создание..."
              : isEditMode
                ? "Сохранить представителя"
                : "Создать представителя"}
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
