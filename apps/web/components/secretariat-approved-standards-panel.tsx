"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApprovedStandardRecord, SubcommitteeSummary } from "@tk182/shared-types";

import { formatPublicationStatus } from "../lib/content";
import { extractApiErrorMessage, toDateInputValue } from "../lib/form-utils";
import { formatDate } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatApprovedStandardsPanelProps {
  standards: ApprovedStandardRecord[];
  subcommittees: SubcommitteeSummary[];
}

export function SecretariatApprovedStandardsPanel({
  standards,
  subcommittees
}: SecretariatApprovedStandardsPanelProps) {
  const router = useRouter();
  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [responsibleSubcommitteeId, setResponsibleSubcommitteeId] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedStandard = standards.find((item) => item.id === selectedStandardId) ?? null;
  const isEditMode = Boolean(selectedStandard);

  useEffect(() => {
    if (!selectedStandard) {
      setCode("");
      setTitle("");
      setSummary("");
      setApprovalDate("");
      setPublicationDate("");
      setResponsibleSubcommitteeId(subcommittees[0]?.id ?? "");
      setFileDescription("");
      setFile(null);
      return;
    }

    setCode(selectedStandard.code);
    setTitle(selectedStandard.title);
    setSummary(selectedStandard.summary);
    setApprovalDate(toDateInputValue(selectedStandard.approvalDate));
    setPublicationDate(toDateInputValue(selectedStandard.publicationDate));
    setResponsibleSubcommitteeId(selectedStandard.responsibleSubcommittee?.id ?? "");
    setFileDescription(selectedStandard.attachment?.description ?? "");
    setFile(null);
  }, [selectedStandard, subcommittees]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.set("code", code);
    formData.set("title", title);
    formData.set("summary", summary);
    formData.set("approvalDate", new Date(approvalDate).toISOString());
    formData.set("publicationDate", new Date(publicationDate).toISOString());
    formData.set("responsibleSubcommitteeId", responsibleSubcommitteeId);
    formData.set("fileDescription", fileDescription);

    if (file) {
      formData.set("file", file);
    }

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/standards/backoffice/approved/${encodeURIComponent(
            selectedStandard!.id
          )}`
        : `${apiBaseUrl}/standards/backoffice/approved`,
      {
        method: isEditMode ? "PATCH" : "POST",
        credentials: "include",
        body: formData
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode
            ? "Не удалось обновить утвержденный стандарт."
            : "Не удалось создать утвержденный стандарт."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      isEditMode
        ? "Утвержденный стандарт обновлен."
        : "Утвержденный стандарт создан."
    );

    if (!isEditMode) {
      setSelectedStandardId("");
      setCode("");
      setTitle("");
      setSummary("");
      setApprovalDate("");
      setPublicationDate("");
      setResponsibleSubcommitteeId(subcommittees[0]?.id ?? "");
      setFileDescription("");
      setFile(null);
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleStatusChange(standardId: string, action: "publish" | "unpublish") {
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/standards/backoffice/approved/${encodeURIComponent(standardId)}/${action}`,
      {
        method: "POST",
        credentials: "include"
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          action === "publish"
            ? "Не удалось опубликовать утвержденный стандарт."
            : "Не удалось снять утвержденный стандарт с публикации."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      action === "publish"
        ? "Утвержденный стандарт опубликован."
        : "Утвержденный стандарт снят с публикации."
    );
    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card">
      <h2>Утвержденные стандарты</h2>
      <div className="content-stack">
        {standards.map((standard) => (
          <div key={standard.id} className="review-card">
            <div className="review-card-header">
              <div>
                <div className="eyebrow">{standard.code}</div>
                <strong>{standard.title}</strong>
                <p>{standard.summary}</p>
              </div>
              <div className="pill-row">
                <span className="pill">{formatPublicationStatus(standard.status)}</span>
                <span className="pill">Утвержден: {formatDate(standard.approvalDate)}</span>
              </div>
            </div>
            <div className="pill-row">
              <span className="pill">
                {standard.responsibleSubcommittee
                  ? `${standard.responsibleSubcommittee.code} — ${standard.responsibleSubcommittee.title}`
                  : "Подкомитет не указан"}
              </span>
              <button
                className="pill pill-button"
                type="button"
                onClick={() => {
                  setSelectedStandardId(standard.id);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                Редактировать
              </button>
              <button
                className="pill pill-button"
                type="button"
                onClick={() => {
                  void handleStatusChange(
                    standard.id,
                    standard.status === "published" ? "unpublish" : "publish"
                  );
                }}
                disabled={isPending}
              >
                {standard.status === "published" ? "Снять с публикации" : "Опубликовать"}
              </button>
              {standard.attachment ? (
                <a
                  className="pill"
                  href={`${apiBaseUrl}/standards/backoffice/approved/${standard.id}/download`}
                >
                  Скачать файл
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field-label">
            <span>Режим формы</span>
            <select
              className="text-input"
              value={selectedStandardId}
              onChange={(event) => {
                setSelectedStandardId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новый утвержденный стандарт</option>
              {standards.map((standard) => (
                <option key={standard.id} value={standard.id}>
                  {standard.code} — {standard.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Ответственный подкомитет</span>
            <select
              className="text-input"
              value={responsibleSubcommitteeId}
              onChange={(event) => {
                setResponsibleSubcommitteeId(event.target.value);
              }}
            >
              <option value="">Не указан</option>
              {subcommittees.map((subcommittee) => (
                <option key={subcommittee.id} value={subcommittee.id}>
                  {subcommittee.code} — {subcommittee.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label className="field-label">
            <span>Обозначение</span>
            <input
              className="text-input"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
              }}
              placeholder="Например, ГОСТ Р 12345-2026"
            />
          </label>

          <label className="field-label">
            <span>Дата утверждения</span>
            <input
              className="text-input"
              type="date"
              value={approvalDate}
              onChange={(event) => {
                setApprovalDate(event.target.value);
              }}
            />
          </label>
        </div>

        <label className="field-label">
          <span>Название</span>
          <input
            className="text-input"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </label>

        <label className="field-label">
          <span>Краткое описание</span>
          <textarea
            className="text-area"
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
            }}
          />
        </label>

        <div className="form-grid">
          <label className="field-label">
            <span>Дата публикации</span>
            <input
              className="text-input"
              type="date"
              value={publicationDate}
              onChange={(event) => {
                setPublicationDate(event.target.value);
              }}
            />
          </label>

          <label className="field-label">
            <span>Файл</span>
            <input
              className="text-input"
              type="file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>
        </div>

        <label className="field-label">
          <span>Описание файла</span>
          <input
            className="text-input"
            value={fileDescription}
            onChange={(event) => {
              setFileDescription(event.target.value);
            }}
          />
        </label>

        <div className="stack-actions">
          <button className="pill pill-button" type="submit" disabled={isPending}>
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Создание..."
              : isEditMode
                ? "Сохранить стандарт"
                : "Создать стандарт"}
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
