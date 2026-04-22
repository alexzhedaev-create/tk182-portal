"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { CommitteeEditableOrganizationRecord } from "@tk182/shared-types";

import { extractApiErrorMessage } from "../lib/form-utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatCommitteeOrganizationsPanelProps {
  organizations: CommitteeEditableOrganizationRecord[];
}

export function SecretariatCommitteeOrganizationsPanel({
  organizations
}: SecretariatCommitteeOrganizationsPanelProps) {
  const router = useRouter();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ??
    null;

  useEffect(() => {
    if (!selectedOrganization) {
      setName("");
      setShortName("");
      setCountryCode("");
      return;
    }

    setName(selectedOrganization.name);
    setShortName(selectedOrganization.shortName);
    setCountryCode(selectedOrganization.countryCode ?? "");
  }, [selectedOrganization]);

  const isEditMode = Boolean(selectedOrganization);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/committee/backoffice/organizations/${encodeURIComponent(
            selectedOrganization!.id
          )}`
        : `${apiBaseUrl}/committee/backoffice/organizations`,
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          shortName,
          countryCode
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить организацию."
            : "Не удалось создать организацию."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      isEditMode ? "Сведения об организации обновлены." : "Организация создана."
    );

    if (!isEditMode) {
      setSelectedOrganizationId("");
      setName("");
      setShortName("");
      setCountryCode("");
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article
      className="content-card"
      data-testid="secretariat-committee-organizations-panel"
    >
      <h2>Организации</h2>
      <p className="status-note">
        В MVP доступны создание и обновление карточек организаций. Удаление не
        предусмотрено.
      </p>

      <div className="content-stack">
        {organizations.map((organization) => (
          <div
            key={organization.id}
            className="review-card"
            data-testid={`secretariat-committee-organization-card-${organization.id}`}
          >
            <div className="review-card-header">
              <div>
                <strong>{organization.name}</strong>
                <p className="status-note">{organization.shortName}</p>
              </div>
              <div className="pill-row">
                <span className="pill">
                  {organization.countryCode ?? "Код страны не указан"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        className="form-card"
        data-testid="secretariat-committee-organization-form"
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <label className="field-label">
            <span>Режим формы</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-organization-edit-select"
              value={selectedOrganizationId}
              onChange={(event) => {
                setSelectedOrganizationId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новая организация</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Код страны</span>
            <input
              className="text-input"
              data-testid="secretariat-committee-organization-country-code"
              value={countryCode}
              onChange={(event) => {
                setCountryCode(event.target.value);
              }}
              placeholder="Например, RU"
            />
          </label>
        </div>

        <label className="field-label">
          <span>Полное наименование</span>
          <input
            className="text-input"
            data-testid="secretariat-committee-organization-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="Введите полное наименование организации"
          />
        </label>

        <label className="field-label">
          <span>Краткое наименование</span>
          <input
            className="text-input"
            data-testid="secretariat-committee-organization-short-name"
            value={shortName}
            onChange={(event) => {
              setShortName(event.target.value);
            }}
            placeholder="Введите краткое наименование организации"
          />
        </label>

        <div className="stack-actions">
          <button
            className="pill pill-button"
            data-testid="secretariat-committee-organization-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Создание..."
              : isEditMode
                ? "Сохранить организацию"
                : "Создать организацию"}
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
