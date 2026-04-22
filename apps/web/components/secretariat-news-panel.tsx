"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { NewsItemRecord } from "@tk182/shared-types";

import { formatPublicationStatus } from "../lib/content";
import { extractApiErrorMessage, toDateInputValue } from "../lib/form-utils";
import { formatDate } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface SecretariatNewsPanelProps {
  newsItems: NewsItemRecord[];
}

export function SecretariatNewsPanel({ newsItems }: SecretariatNewsPanelProps) {
  const router = useRouter();
  const [selectedNewsId, setSelectedNewsId] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedNews = newsItems.find((item) => item.id === selectedNewsId) ?? null;
  const isEditMode = Boolean(selectedNews);

  useEffect(() => {
    if (!selectedNews) {
      setTitle("");
      setExcerpt("");
      setBody("");
      setPublicationDate("");
      return;
    }

    setTitle(selectedNews.title);
    setExcerpt(selectedNews.excerpt);
    setBody(selectedNews.body);
    setPublicationDate(toDateInputValue(selectedNews.publicationDate));
  }, [selectedNews]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      isEditMode
        ? `${apiBaseUrl}/news/backoffice/${encodeURIComponent(selectedNews!.id)}`
        : `${apiBaseUrl}/news/backoffice`,
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          excerpt,
          body,
          publicationDate: new Date(publicationDate).toISOString()
        })
      }
    );

    if (!response.ok) {
      setErrorMessage(
        await extractApiErrorMessage(
          response,
          isEditMode ? "Не удалось обновить новость." : "Не удалось создать новость."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(isEditMode ? "Новость обновлена." : "Новость создана.");

    if (!isEditMode) {
      setSelectedNewsId("");
      setTitle("");
      setExcerpt("");
      setBody("");
      setPublicationDate("");
    }

    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleStatusChange(newsId: string, action: "publish" | "unpublish") {
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(
      `${apiBaseUrl}/news/backoffice/${encodeURIComponent(newsId)}/${action}`,
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
            ? "Не удалось опубликовать новость."
            : "Не удалось снять новость с публикации."
        )
      );
      setIsPending(false);
      return;
    }

    setSuccessMessage(
      action === "publish" ? "Новость опубликована." : "Новость снята с публикации."
    );
    setIsPending(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="secretariat-news-panel">
      <h2>Новости</h2>
      <p className="status-note">
        Новости публикуются на публичной странице портала и используются для ручной
        миграции объявлений со старого сайта.
      </p>

      <div className="content-stack">
        {newsItems.map((item) => (
          <div key={item.id} className="review-card" data-testid={`secretariat-news-card-${item.id}`}>
            <div className="review-card-header">
              <div>
                <strong>{item.title}</strong>
                <p>{item.excerpt}</p>
              </div>
              <div className="pill-row">
                <span className="pill">{formatPublicationStatus(item.status)}</span>
                <span className="pill">{formatDate(item.publicationDate)}</span>
              </div>
            </div>
            <div className="pill-row">
              <button
                className="pill pill-button"
                type="button"
                onClick={() => {
                  setSelectedNewsId(item.id);
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
                    item.id,
                    item.status === "published" ? "unpublish" : "publish"
                  );
                }}
                disabled={isPending}
              >
                {item.status === "published" ? "Снять с публикации" : "Опубликовать"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <form
        className="form-card"
        data-testid="secretariat-news-form"
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <label className="field-label">
            <span>Режим формы</span>
            <select
              className="text-input"
              data-testid="secretariat-news-select"
              value={selectedNewsId}
              onChange={(event) => {
                setSelectedNewsId(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <option value="">Новая новость</option>
              {newsItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            <span>Дата публикации</span>
            <input
              className="text-input"
              data-testid="secretariat-news-publication-date"
              type="date"
              value={publicationDate}
              onChange={(event) => {
                setPublicationDate(event.target.value);
              }}
            />
          </label>
        </div>

        <label className="field-label">
          <span>Заголовок</span>
          <input
            className="text-input"
            data-testid="secretariat-news-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="Введите заголовок новости"
          />
        </label>

        <label className="field-label">
          <span>Краткое описание</span>
          <textarea
            className="text-area"
            data-testid="secretariat-news-excerpt"
            value={excerpt}
            onChange={(event) => {
              setExcerpt(event.target.value);
            }}
            placeholder="Краткое описание для списка новостей"
          />
        </label>

        <label className="field-label">
          <span>Текст новости</span>
          <textarea
            className="text-area"
            data-testid="secretariat-news-body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
            }}
            placeholder="Полный текст новости"
          />
        </label>

        <div className="stack-actions">
          <button
            className="pill pill-button"
            data-testid="secretariat-news-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending
              ? isEditMode
                ? "Сохранение..."
                : "Создание..."
              : isEditMode
                ? "Сохранить новость"
                : "Создать новость"}
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
