"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type { NotificationRecord } from "@tk182/shared-types";

import { formatDateTime } from "../lib/review";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

interface ParticipantNotificationsPanelProps {
  notifications: NotificationRecord[];
  unreadCount: number;
}

export function ParticipantNotificationsPanel({
  notifications,
  unreadCount
}: ParticipantNotificationsPanelProps) {
  const router = useRouter();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function markOneAsRead(notificationId: string): Promise<void> {
    setErrorMessage(null);
    setPendingNotificationId(notificationId);

    const response = await fetch(
      `${apiBaseUrl}/notifications/${encodeURIComponent(notificationId)}/read`,
      {
        method: "POST",
        credentials: "include"
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setErrorMessage(payload?.message ?? "Не удалось отметить уведомление как прочитанное.");
      setPendingNotificationId(null);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function markAllAsRead(): Promise<void> {
    setErrorMessage(null);
    setIsMarkingAll(true);

    const response = await fetch(`${apiBaseUrl}/notifications/read-all`, {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setErrorMessage(payload?.message ?? "Не удалось отметить уведомления как прочитанные.");
      setIsMarkingAll(false);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="content-card" data-testid="participant-notifications-panel">
      <div className="review-card-header">
        <div>
          <h2>Уведомления</h2>
          <p className="status-note">
            Непрочитанных:{" "}
            <strong data-testid="participant-notifications-unread-count">
              {unreadCount}
            </strong>
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            className="pill pill-button"
            data-testid="participant-notifications-read-all"
            type="button"
            disabled={isMarkingAll}
            onClick={() => {
              void markAllAsRead();
            }}
          >
            {isMarkingAll ? "Обновление..." : "Прочитать все"}
          </button>
        ) : null}
      </div>

      <div className="content-stack">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="review-card"
              data-testid={`participant-notification-${notification.id}`}
            >
              <div className="review-card-header">
                <div>
                  <strong>{notification.title}</strong>
                  <p className="status-note">{formatDateTime(notification.createdAt)}</p>
                </div>
                <span className="pill">
                  {notification.readAt ? "Прочитано" : "Не прочитано"}
                </span>
              </div>

              <p>{notification.message}</p>

              <div className="pill-row">
                {notification.targetRoute ? (
                  <Link className="pill" href={notification.targetRoute}>
                    Открыть
                  </Link>
                ) : null}
                {!notification.readAt ? (
                  <button
                    className="pill pill-button"
                    data-testid={`participant-notification-read-${notification.id}`}
                    type="button"
                    disabled={pendingNotificationId === notification.id}
                    onClick={() => {
                      void markOneAsRead(notification.id);
                    }}
                  >
                    {pendingNotificationId === notification.id
                      ? "Обновление..."
                      : "Отметить как прочитанное"}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p>Новых уведомлений пока нет.</p>
        )}
      </div>

      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </article>
  );
}
