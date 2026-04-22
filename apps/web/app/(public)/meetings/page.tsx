import Link from "next/link";

import { getPublicApiUrl, getPublicMeetingsPageData } from "../../../lib/api";
import { formatMeetingRecordCategory } from "../../../lib/content";
import { formatDate, formatFileSize } from "../../../lib/review";

export const dynamic = "force-dynamic";

interface MeetingsPageProps {
  searchParams?: {
    q?: string;
  };
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const [pageData, apiBaseUrl] = await Promise.all([
    getPublicMeetingsPageData(),
    Promise.resolve(getPublicApiUrl())
  ]);
  const query = searchParams?.q?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("ru");
  const filteredSections = pageData.sections.map((section) => ({
    ...section,
    meetings: normalizedQuery
      ? section.meetings.filter((meeting) =>
          [
            meeting.title,
            meeting.summary,
            meeting.body,
            meeting.location ?? ""
          ]
            .join(" ")
            .toLocaleLowerCase("ru")
            .includes(normalizedQuery)
        )
      : section.meetings
  }));

  const totalMeetings = pageData.sections.reduce(
    (count, section) => count + section.meetings.length,
    0
  );
  const filteredMeetingsCount = filteredSections.reduce(
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
          {query ? <span className="pill">Найдено: {filteredMeetingsCount}</span> : null}
        </div>
      </section>

      <section className="content-card">
        <h2>Поиск по заседаниям</h2>
        <form className="form-grid" method="get">
          <label>
            <span className="eyebrow">Поиск</span>
            <input
              className="text-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Введите тему заседания, дату или место"
            />
          </label>
          <div className="pill-row">
            <button className="pill" type="submit">
              Найти
            </button>
            {query ? (
              <Link className="pill" href="/meetings">
                Сбросить фильтр
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="content-stack">
        {filteredSections.map((section) => (
          <article key={section.category} className="content-card">
            <h2>{formatMeetingRecordCategory(section.category)}</h2>
            <div className="content-stack">
              {section.meetings.length > 0 ? (
                section.meetings.map((meeting) => (
                  <div key={meeting.id} className="review-card">
                    <div className="review-card-header">
                      <div>
                        <strong>
                          <Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link>
                        </strong>
                        <p>{meeting.summary}</p>
                      </div>
                      <div className="pill-row">
                        <span className="pill">Дата: {formatDate(meeting.meetingDate)}</span>
                        <span className="pill">Публикация: {formatDate(meeting.publicationDate)}</span>
                      </div>
                    </div>

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

                    <div className="pill-row">
                      <Link className="pill" href={`/meetings/${meeting.id}`}>
                        Открыть карточку
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
                  </div>
                ))
              ) : (
                <p>
                  {query
                    ? "По выбранному фильтру записи не найдены."
                    : "В этом разделе пока нет опубликованных записей."}
                </p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
