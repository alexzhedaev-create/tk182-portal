import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicApiUrl,
  getPublicMeeting,
  isApiNotFoundError
} from "../../../../lib/api";
import { formatMeetingRecordCategory } from "../../../../lib/content";
import { formatDate, formatFileSize } from "../../../../lib/review";

export const dynamic = "force-dynamic";

interface MeetingDetailPageProps {
  params: {
    meetingId: string;
  };
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  try {
    const [meeting, apiBaseUrl] = await Promise.all([
      getPublicMeeting(params.meetingId),
      Promise.resolve(getPublicApiUrl())
    ]);

    return (
      <div className="page-frame">
        <section className="hero-card">
          <div>
            <div className="eyebrow">{formatMeetingRecordCategory(meeting.category)}</div>
            <h1 className="page-title">{meeting.title}</h1>
            <p className="page-intro">{meeting.summary}</p>
          </div>

          <div className="pill-row">
            <span className="pill">Дата заседания: {formatDate(meeting.meetingDate)}</span>
            <span className="pill">
              Дата публикации: {formatDate(meeting.publicationDate)}
            </span>
            <Link className="pill" href="/meetings">
              Ко всем заседаниям
            </Link>
            {meeting.attachment ? (
              <Link
                className="pill"
                href={`${apiBaseUrl}/meetings/public/${meeting.id}/download`}
              >
                Скачать
              </Link>
            ) : null}
          </div>
        </section>

        <section className="info-grid">
          <article className="content-card">
            <h2>Сведения о заседании</h2>
            <div className="content-stack">
              <div>
                <strong>Раздел</strong>
                <p>{formatMeetingRecordCategory(meeting.category)}</p>
              </div>
              <div>
                <strong>Дата заседания</strong>
                <p>{formatDate(meeting.meetingDate)}</p>
              </div>
              <div>
                <strong>Место проведения</strong>
                <p>{meeting.location ?? "Не указано"}</p>
              </div>
              <div>
                <strong>Краткое описание</strong>
                <p>{meeting.summary}</p>
              </div>
            </div>
          </article>

          <article className="content-card">
            <h2>Файл заседания</h2>
            {meeting.attachment ? (
              <div className="content-stack">
                <div>
                  <strong>Файл</strong>
                  <p>{meeting.attachment.originalName}</p>
                </div>
                <div>
                  <strong>Описание</strong>
                  <p>{meeting.attachment.description ?? "Не указано"}</p>
                </div>
                <div>
                  <strong>Дата загрузки</strong>
                  <p>{formatDate(meeting.attachment.uploadedAt)}</p>
                </div>
                <div>
                  <strong>Размер</strong>
                  <p>{formatFileSize(meeting.attachment.sizeBytes)}</p>
                </div>
              </div>
            ) : (
              <p>Файл для этой записи заседания пока не добавлен.</p>
            )}
          </article>
        </section>

        <article className="content-card">
          <h2>Содержание</h2>
          <p style={{ whiteSpace: "pre-line" }}>{meeting.body}</p>
        </article>
      </div>
    );
  } catch (error) {
    if (isApiNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}
