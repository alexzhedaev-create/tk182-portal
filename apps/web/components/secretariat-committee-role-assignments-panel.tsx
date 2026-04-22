"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CommitteeEditablePersonRecord,
  CommitteeRoleAssignmentRecord,
  CommitteeRoleCategory,
  CommitteeRoleSummary
} from "@tk182/shared-types";

import { extractApiErrorMessage } from "../lib/form-utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatCommitteeRoleAssignmentsPanelProps {
  assignments: CommitteeRoleAssignmentRecord[];
  people: CommitteeEditablePersonRecord[];
  roles: CommitteeRoleSummary[];
}

function formatCategory(category: CommitteeRoleCategory): string {
  switch (category) {
    case "leadership":
      return "Руководство ТК";
    case "deputy":
      return "Заместители сопредседателей";
    case "secretariat":
      return "Секретариат";
    default:
      return category;
  }
}

export function SecretariatCommitteeRoleAssignmentsPanel({
  assignments,
  people,
  roles
}: SecretariatCommitteeRoleAssignmentsPanelProps) {
  const router = useRouter();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [sortOrder, setSortOrder] = useState("10");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedAssignment =
    assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;

  useEffect(() => {
    if (!selectedAssignment) {
      setPersonId(people[0]?.id ?? "");
      setRoleId(roles[0]?.id ?? "");
      setSortOrder("10");
      return;
    }

    setPersonId(selectedAssignment.personId);
    setRoleId(selectedAssignment.roleId);
    setSortOrder(String(selectedAssignment.sortOrder));
  }, [people, roles, selectedAssignment]);

  const isEditMode = Boolean(selectedAssignment);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/committee/backoffice/role-assignments/${encodeURIComponent(
            selectedAssignment!.id
          )}`
        : `${apiBaseUrl}/committee/backoffice/role-assignments`,
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          personId,
          roleId,
          sortOrder: Number(sortOrder)
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить назначение роли."
            : "Не удалось назначить роль."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      isEditMode ? "Назначение роли обновлено." : "Роль назначена."
    );

    if (!isEditMode) {
      setSelectedAssignmentId("");
      setSortOrder("10");
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  const categories: CommitteeRoleCategory[] = ["leadership", "deputy", "secretariat"];

  return (
    <article className="content-card" data-testid="secretariat-committee-role-panel">
      <h2>Руководство ТК и секретариат</h2>
      <div className="content-stack">
        {categories.map((category) => {
          const categoryAssignments = assignments.filter(
            (assignment) => assignment.role.category === category
          );

          return (
            <div key={category} className="review-card">
              <div className="review-card-header">
                <strong>{formatCategory(category)}</strong>
                <span className="pill">Назначений: {categoryAssignments.length}</span>
              </div>
              <div className="content-stack">
                {categoryAssignments.length > 0 ? (
                  categoryAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="review-card"
                      data-testid={`secretariat-committee-role-card-${assignment.id}`}
                    >
                      <div className="review-card-header">
                        <div>
                          <strong>{assignment.role.title}</strong>
                          <p>
                            {assignment.person.fullName} • {assignment.person.jobTitle}
                          </p>
                        </div>
                        <div className="pill-row">
                          <span className="pill">
                            {assignment.person.organization?.shortName ??
                              "Организация не указана"}
                          </span>
                          <span className="pill">Порядок: {assignment.sortOrder}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Назначения в этой группе пока не заданы.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="form-card"
        data-testid="secretariat-committee-role-form"
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <label className="field-label">
            <span>Режим формы</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-role-edit-select"
              value={selectedAssignmentId}
              onChange={(event) => {
                setSelectedAssignmentId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новое назначение</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.role.title} — {assignment.person.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Порядок отображения</span>
            <input
              className="text-input"
              data-testid="secretariat-committee-role-sort-order"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value);
              }}
            />
          </label>
        </div>

        <div className="form-grid">
          <label className="field-label">
            <span>Представитель</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-role-person"
              value={personId}
              onChange={(event) => {
                setPersonId(event.target.value);
              }}
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Комитетная роль</span>
            <select
              className="text-input"
              data-testid="secretariat-committee-role-role"
              value={roleId}
              onChange={(event) => {
                setRoleId(event.target.value);
              }}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title} • {formatCategory(role.category)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="stack-actions">
          <button
            className="pill pill-button"
            data-testid="secretariat-committee-role-submit"
            type="submit"
            disabled={isPending || people.length === 0 || roles.length === 0}
          >
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Назначение..."
              : isEditMode
                ? "Сохранить назначение"
                : "Назначить роль"}
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
