import Link from "next/link";

import { getPublicApiUrl, getPublicMeetingsPageData } from "../../../lib/api";
import { formatMeetingRecordCategory } from "../../../lib/content";
import { formatDate, formatFileSize } from "../../../lib/review";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const [pageData, apiBaseUrl] = await Promise.all([
    getPublicMeetingsPageData(),
    Promise.resolve(getPublicApiUrl())
  ]);

  const totalMeetings = pageData.sections.reduce(
    (count, section) => count + section.meetings.length,
    0
  );

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Публичный календарь</div>
          <h1 className="page-title">Заседания</h1>
          <p className="page-intro">
            В разделе собраны уведомления и повестки заседаний, а также опубликованные
            протоколы ТК 182. Эти записи подготовлены для переноса актуального контента
            со старого сайта в управляемый backoffice нового портала.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Опубликовано записей: {totalMeetings}</span>
        </div>
      </section>

      <section className="content-stack">
        {pageData.sections.map((section) => (
          <article key={section.category} className="content-card">
            <h2>{formatMeetingRecordCategory(section.category)}</h2>
            <div className="content-stack">
              {section.meetings.length > 0 ? (
                section.meetings.map((meeting) => (
                  <div key={meeting.id} className="review-card">
                    <div className="review-card-header">
                      <div>
                        <strong>{meeting.title}</strong>
                        <p>{meeting.summary}</p>
                      </div>
                      <div className="pill-row">
                        <span className="pill">Дата: {formatDate(meeting.meetingDate)}</span>
                        <span className="pill">Публикация: {formatDate(meeting.publicationDate)}</span>
                      </div>
                    </div>

                    <p style={{ whiteSpace: "pre-line" }}>{meeting.body}</p>

                    <div className="info-grid compact-grid">
                      <div>
                        <strong>Место проведения</strong>
                        <p>{meeting.location ?? "Не указано"}</p>
                      </div>
                      {meeting.attachment ? (
                        <>
                          <div>
                            <strong>Файл</strong>
                            <p>{meeting.attachment.originalName}</p>
                          </div>
                          <div>
                            <strong>Размер</strong>
                            <p>{formatFileSize(meeting.attachment.sizeBytes)}</p>
                          </div>
                        </>
                      ) : null}
                    </div>

                    {meeting.attachment ? (
                      <div className="pill-row">
                        <Link
                          className="pill"
                          href={`${apiBaseUrl}/meetings/public/${meeting.id}/download`}
                        >
                          Скачать
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p>В этом разделе пока нет опубликованных записей.</p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
