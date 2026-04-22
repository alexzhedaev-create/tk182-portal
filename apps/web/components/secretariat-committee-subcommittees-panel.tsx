"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CommitteeEditableOrganizationRecord,
  SubcommitteeSummary
} from "@tk182/shared-types";

import { extractApiErrorMessage } from "../lib/form-utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatCommitteeSubcommitteesPanelProps {
  organizations: CommitteeEditableOrganizationRecord[];
  subcommittees: SubcommitteeSummary[];
}

export function SecretariatCommitteeSubcommitteesPanel({
  organizations,
  subcommittees
}: SecretariatCommitteeSubcommitteesPanelProps) {
  const router = useRouter();
  const [selectedSubcommitteeId, setSelectedSubcommitteeId] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [hostOrganizationId, setHostOrganizationId] = useState(
    organizations[0]?.id ?? ""
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSubcommittee =
    subcommittees.find((subcommittee) => subcommittee.id === selectedSubcommitteeId) ??
    null;

  useEffect(() => {
    if (!selectedSubcommittee) {
      setCode("");
      setTitle("");
      setHostOrganizationId(organizations[0]?.id ?? "");
      return;
    }

    setCode(selectedSubcommittee.code);
    setTitle(selectedSubcommittee.title);
    setHostOrganizationId(selectedSubcommittee.hostOrganization.id);
  }, [organizations, selectedSubcommittee]);

  const isEditMode = Boolean(selectedSubcommittee);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/committee/backoffice/subcommittees/${encodeURIComponent(
            selectedSubcommittee!.id
          )}`
        : `${apiBaseUrl}/committee/backoffice/subcommittees`,
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          code,
          title,
          hostOrganizationId
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить подкомитет."
            : "Не удалось создать подкомитет."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      isEditMode ? "Сведения о подкомитете обновлены." : "Подкомитет создан."
    );

    if (!isEditMode) {
      setSelectedSubcommitteeId("");
      setCode("");
      setTitle("");
      setHostOrganizationId(organizations[0]?.id ?? "");
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article
      className="content-card"
      data-testid="secretariat-committee-subcommittees-panel"
    >
      <h2>Подкомитеты</h2>
      <div className="content-stack">
        {subcommittees.map((subcommittee) => (
          <div
            key={subcommittee.id}
            className="review-card"
            data-testid={`secretariat-committee-subcommittee-card-${subcommittee.id}`}
          >
            <div className="review-card-header">
              <div>
                <strong>
                  {subcommittee.code} — {subcommittee.title}
                </strong>
                <p className="status-note">
                  Базовая организация: {subcommittee.hostOrganization.name}
                </p>
              </div>
              <span className="pill">{subcommittee.hostOrganization.shortName}</span>
            </div>
          </div>
        ))}
      </div>

      <form
        className="form-card"
        data-testid="secretariat-committee-subcommittee-form"
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <label className="field-label">
            <span>Режим формы</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-subcommittee-edit-select"
              value={selectedSubcommitteeId}
              onChange={(event) => {
                setSelectedSubcommitteeId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новый подкомитет</option>
              {subcommittees.map((subcommittee) => (
                <option key={subcommittee.id} value={subcommittee.id}>
                  {subcommittee.code} — {subcommittee.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Базовая организация</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-subcommittee-organization"
              value={hostOrganizationId}
              onChange={(event) => {
                setHostOrganizationId(event.target.value);
              }}
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label className="field-label">
            <span>Код подкомитета</span>
            <input
              className="text-input"
              data-testid="secretariat-committee-subcommittee-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
              }}
              placeholder="Например, ПК 8"
            />
          </label>

          <label className="field-label">
            <span>Название подкомитета</span>
            <input
              className="text-input"
              data-testid="secretariat-committee-subcommittee-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder="Введите полное название подкомитета"
            />
          </label>
        </div>

        <div className="stack-actions">
          <button
            className="pill pill-button"
            data-testid="secretariat-committee-subcommittee-submit"
            type="submit"
            disabled={isPending || organizations.length === 0}
          >
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Создание..."
              : isEditMode
                ? "Сохранить подкомитет"
                : "Создать подкомитет"}
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
