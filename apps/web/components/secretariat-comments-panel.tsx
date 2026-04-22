"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type { ReviewCommentRecord, ReviewCommentStatus } from "@tk182/shared-types";

import { formatDateTime, formatReviewCommentStatus } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

const statusOptions: ReviewCommentStatus[] = [
  "RECEIVED",
  "IN_REVIEW",
  "ACCEPTED",
  "PARTIALLY_ACCEPTED",
  "REJECTED",
  "NEEDS_CLARIFICATION"
];

interface SecretariatCommentsPanelProps {
  comments: ReviewCommentRecord[];
}

interface SecretariatCommentStatusItemProps {
  comment: ReviewCommentRecord;
}

function SecretariatCommentStatusItem({
  comment
}: SecretariatCommentStatusItemProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewCommentStatus>(comment.reviewStatus);
  const [responseText, setResponseText] = useState(comment.secretariatResponse ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const response = await fetch(
      `${apiBaseUrl}/approval/secretariat/comments/${encodeURIComponent(comment.id)}/status`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          reviewStatus: status,
          secretariatResponse: responseText || null
        })
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setErrorMessage(payload?.message ?? "Не удалось обновить статус замечания.");
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form
      className="review-card content-stack"
      data-testid={`secretariat-comment-card-${comment.id}`}
      onSubmit={handleSave}
    >
      <div className="review-card-header">
        <div>
          <strong>
            {comment.organizationName ?? "Организация не указана"}:{" "}
            {comment.authorDisplayName}
          </strong>
          <p className="status-note">
            {comment.sectionRef}
            {comment.pointRef ? `, ${comment.pointRef}` : ""}
            {comment.pageRef ? `, стр. ${comment.pageRef}` : ""}{" "}
            • {formatDateTime(comment.createdAt)}
          </p>
        </div>
        <span className="pill">{formatReviewCommentStatus(comment.reviewStatus)}</span>
      </div>

      <div>
        <strong>Замечание</strong>
        <p>{comment.remark}</p>
      </div>

      <div>
        <strong>Предлагаемая редакция</strong>
        <p>{comment.proposedText}</p>
      </div>

      <div>
        <strong>Обоснование</strong>
        <p>{comment.rationale}</p>
      </div>

      <label className="field-label">
        <span>Статус рассмотрения</span>
        <select
          className="text-input"
          data-testid={`secretariat-comment-status-${comment.id}`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ReviewCommentStatus);
          }}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {formatReviewCommentStatus(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="field-label">
        <span>Ответ секретариата</span>
        <textarea
          className="text-area"
          data-testid={`secretariat-comment-response-${comment.id}`}
          value={responseText}
          onChange={(event) => {
            setResponseText(event.target.value);
          }}
          placeholder="Добавьте комментарий по результату рассмотрения"
        />
      </label>

      <div className="stack-actions">
        <button
          className="pill pill-button"
          data-testid={`secretariat-comment-submit-${comment.id}`}
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Сохранение..." : "Сохранить статус и ответ"}
        </button>
      </div>

      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}

export function SecretariatCommentsPanel({
  comments
}: SecretariatCommentsPanelProps) {
  return (
    <article className="content-card" data-testid="secretariat-comments-panel">
      <h2>Замечания участников</h2>
      <div className="content-stack">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <SecretariatCommentStatusItem key={comment.id} comment={comment} />
          ))
        ) : (
          <p>Замечаний по этому циклу пока нет.</p>
        )}
      </div>
    </article>
  );
}
