"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type { ReviewCommentRecord } from "@tk182/shared-types";

import { formatDateTime, formatReviewCommentStatus } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface CommentFormState {
  pageRef: string;
  pointRef: string;
  proposedText: string;
  rationale: string;
  remark: string;
  sectionRef: string;
}

interface ParticipantCommentsPanelProps {
  comments: ReviewCommentRecord[];
  cycleId: string;
  draftStandardId: string;
  hasSubmittedPosition: boolean;
  isCycleOpen: boolean;
}

function createEmptyFormState(): CommentFormState {
  return {
    sectionRef: "",
    pointRef: "",
    pageRef: "",
    remark: "",
    proposedText: "",
    rationale: ""
  };
}

function buildFormState(comment: ReviewCommentRecord): CommentFormState {
  return {
    sectionRef: comment.sectionRef,
    pointRef: comment.pointRef ?? "",
    pageRef: comment.pageRef ?? "",
    remark: comment.remark,
    proposedText: comment.proposedText,
    rationale: comment.rationale
  };
}

function createPayload(state: CommentFormState) {
  return {
    sectionRef: state.sectionRef,
    pointRef: state.pointRef || null,
    pageRef: state.pageRef || null,
    remark: state.remark,
    proposedText: state.proposedText,
    rationale: state.rationale
  };
}

export function ParticipantCommentsPanel({
  comments,
  cycleId,
  draftStandardId,
  hasSubmittedPosition,
  isCycleOpen
}: ParticipantCommentsPanelProps) {
  const router = useRouter();
  const [createState, setCreateState] = useState<CommentFormState>(createEmptyFormState);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editState, setEditState] = useState<CommentFormState>(createEmptyFormState);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const canCreate = isCycleOpen && !hasSubmittedPosition;

  async function handleCreateComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatePending(true);
    setCreateError(null);

    const response = await fetch(
      `${apiBaseUrl}/approval/participant/cycles/${encodeURIComponent(
        cycleId
      )}/drafts/${encodeURIComponent(draftStandardId)}/comments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(createPayload(createState))
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setCreateError(payload?.message ?? "Не удалось сохранить замечание.");
      setCreatePending(false);
      return;
    }

    setCreateState(createEmptyFormState());

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleUpdateComment(commentId: string): Promise<void> {
    setEditPending(true);
    setEditError(null);

    const response = await fetch(
      `${apiBaseUrl}/approval/participant/comments/${encodeURIComponent(commentId)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(createPayload(editState))
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setEditError(payload?.message ?? "Не удалось обновить замечание.");
      setEditPending(false);
      return;
    }

    setEditingCommentId(null);

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDeleteComment(commentId: string): Promise<void> {
    const confirmed = window.confirm("Удалить это замечание?");

    if (!confirmed) {
      return;
    }

    setDeletePendingId(commentId);
    setEditError(null);

    const response = await fetch(
      `${apiBaseUrl}/approval/participant/comments/${encodeURIComponent(commentId)}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setEditError(payload?.message ?? "Не удалось удалить замечание.");
      setDeletePendingId(null);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="participant-comments-panel">
      <h2>Замечания участника</h2>

      <div className="content-stack">
        {comments.length > 0 ? (
          comments.map((comment) => {
            const isEditing = editingCommentId === comment.id;
            const isDeleting = deletePendingId === comment.id;

            return (
              <div
                key={comment.id}
                className="review-card"
                data-testid={`participant-comment-${comment.id}`}
              >
                <div className="review-card-header">
                  <div>
                    <strong>
                      {comment.sectionRef}
                      {comment.pointRef ? `, ${comment.pointRef}` : ""}
                      {comment.pageRef ? `, стр. ${comment.pageRef}` : ""}
                    </strong>
                    <p className="status-note">
                      Создано: {formatDateTime(comment.createdAt)}. Статус:{" "}
                      {formatReviewCommentStatus(comment.reviewStatus)}
                    </p>
                  </div>
                  <div className="pill-row">
                    <span className="pill">
                      {formatReviewCommentStatus(comment.reviewStatus)}
                    </span>
                    {comment.canEdit ? (
                      <button
                        className="pill pill-button"
                        type="button"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditState(buildFormState(comment));
                          setEditError(null);
                        }}
                      >
                        Редактировать
                      </button>
                    ) : null}
                    {comment.canEdit ? (
                      <button
                        className="pill pill-button"
                        type="button"
                        disabled={isDeleting}
                        onClick={() => {
                          void handleDeleteComment(comment.id);
                        }}
                      >
                        {isDeleting ? "Удаление..." : "Удалить"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <form
                    className="content-stack"
                    data-testid={`participant-edit-comment-form-${comment.id}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleUpdateComment(comment.id);
                    }}
                  >
                    <div className="form-grid">
                      <label className="field-label">
                        <span>Раздел / пункт / страница</span>
                        <input
                          className="text-input"
                          value={editState.sectionRef}
                          onChange={(event) => {
                            setEditState((current) => ({
                              ...current,
                              sectionRef: event.target.value
                            }));
                          }}
                          placeholder="Например: Раздел 5"
                          required
                        />
                      </label>
                      <label className="field-label">
                        <span>Пункт</span>
                        <input
                          className="text-input"
                          value={editState.pointRef}
                          onChange={(event) => {
                            setEditState((current) => ({
                              ...current,
                              pointRef: event.target.value
                            }));
                          }}
                          placeholder="Например: п. 5.2"
                        />
                      </label>
                      <label className="field-label">
                        <span>Страница</span>
                        <input
                          className="text-input"
                          value={editState.pageRef}
                          onChange={(event) => {
                            setEditState((current) => ({
                              ...current,
                              pageRef: event.target.value
                            }));
                          }}
                          placeholder="Например: 12"
                        />
                      </label>
                    </div>

                    <label className="field-label">
                      <span>Замечание</span>
                      <textarea
                        className="text-area"
                        value={editState.remark}
                        onChange={(event) => {
                          setEditState((current) => ({
                            ...current,
                            remark: event.target.value
                          }));
                        }}
                        required
                      />
                    </label>

                    <label className="field-label">
                      <span>Предлагаемая редакция</span>
                      <textarea
                        className="text-area"
                        value={editState.proposedText}
                        onChange={(event) => {
                          setEditState((current) => ({
                            ...current,
                            proposedText: event.target.value
                          }));
                        }}
                        required
                      />
                    </label>

                    <label className="field-label">
                      <span>Обоснование</span>
                      <textarea
                        className="text-area"
                        value={editState.rationale}
                        onChange={(event) => {
                          setEditState((current) => ({
                            ...current,
                            rationale: event.target.value
                          }));
                        }}
                        required
                      />
                    </label>

                    <div className="stack-actions">
                      <button className="pill pill-button" type="submit" disabled={editPending}>
                        {editPending ? "Сохранение..." : "Сохранить изменения"}
                      </button>
                      <button
                        className="pill pill-button"
                        type="button"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditError(null);
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="content-stack">
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
                    {comment.secretariatResponse ? (
                      <div>
                        <strong>Ответ секретариата</strong>
                        <p>{comment.secretariatResponse}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p>Замечания пока не добавлены.</p>
        )}
      </div>

      {editError ? (
        <p className="status-note status-note-error" role="alert">
          {editError}
        </p>
      ) : null}

      {canCreate ? (
        <form
          className="content-stack review-card"
          data-testid="participant-create-comment-form"
          onSubmit={handleCreateComment}
        >
          <h3>Добавить замечание</h3>

          <div className="form-grid">
            <label className="field-label">
              <span>Раздел</span>
              <input
                className="text-input"
                value={createState.sectionRef}
                onChange={(event) => {
                  setCreateState((current) => ({
                    ...current,
                    sectionRef: event.target.value
                  }));
                }}
                placeholder="Например: Раздел 5"
                required
              />
            </label>

            <label className="field-label">
              <span>Пункт</span>
              <input
                className="text-input"
                value={createState.pointRef}
                onChange={(event) => {
                  setCreateState((current) => ({
                    ...current,
                    pointRef: event.target.value
                  }));
                }}
                placeholder="Например: п. 5.2"
              />
            </label>

            <label className="field-label">
              <span>Страница</span>
              <input
                className="text-input"
                value={createState.pageRef}
                onChange={(event) => {
                  setCreateState((current) => ({
                    ...current,
                    pageRef: event.target.value
                  }));
                }}
                placeholder="Например: 12"
              />
            </label>
          </div>

          <label className="field-label">
            <span>Замечание</span>
            <textarea
              className="text-area"
              value={createState.remark}
              onChange={(event) => {
                setCreateState((current) => ({
                  ...current,
                  remark: event.target.value
                }));
              }}
              placeholder="Опишите замечание по текущей редакции"
              required
            />
          </label>

          <label className="field-label">
            <span>Предлагаемая редакция</span>
            <textarea
              className="text-area"
              value={createState.proposedText}
              onChange={(event) => {
                setCreateState((current) => ({
                  ...current,
                  proposedText: event.target.value
                }));
              }}
              placeholder="Предложите новую формулировку"
              required
            />
          </label>

          <label className="field-label">
            <span>Обоснование</span>
            <textarea
              className="text-area"
              value={createState.rationale}
              onChange={(event) => {
                setCreateState((current) => ({
                  ...current,
                  rationale: event.target.value
                }));
              }}
              placeholder="Поясните причину изменения"
              required
            />
          </label>

          <div className="stack-actions">
            <button
              className="pill pill-button"
              data-testid="participant-create-comment-submit"
              type="submit"
              disabled={createPending}
            >
              {createPending ? "Сохранение..." : "Добавить замечание"}
            </button>
          </div>

          {createError ? (
            <p className="status-note status-note-error" role="alert">
              {createError}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="status-note">
          {hasSubmittedPosition
            ? "Итоговая позиция уже отправлена, поэтому новые замечания добавить нельзя."
            : "Цикл недоступен для редактирования."}
        </p>
      )}
    </article>
  );
}
