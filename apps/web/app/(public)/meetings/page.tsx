import Link from "next/link";

import { getPublicApiUrl, getPublicMeetingsPageData } from "../../../lib/api";
import { formatMeetingRecordCategory, readQueryValue } from "../../../lib/content";
import { formatDate, formatFileSize } from "../../../lib/review";

export const dynamic = "force-dynamic";

const meetingCategories = ["MEETING_AGENDA", "MEETING_MINUTES"] as const;

interface MeetingsPageProps {
  searchParams?: {
    category?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    q?: string | string[];
  };
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const query = readQueryValue(searchParams?.q)?.trim() ?? "";
  const category = readQueryValue(searchParams?.category)?.trim() ?? "";
  const dateFrom = readQueryValue(searchParams?.dateFrom)?.trim() ?? "";
  const dateTo = readQueryValue(searchParams?.dateTo)?.trim() ?? "";
  const hasFilters = Boolean(query || category || dateFrom || dateTo);
  const [pageData, apiBaseUrl] = await Promise.all([
    getPublicMeetingsPageData({
      ...(query ? { q: query } : {}),
      ...(category ? { category: category as (typeof meetingCategories)[number] } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {})
    }),
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
          <span className="pill">
            {hasFilters ? "Найдено записей" : "Опубликовано записей"}: {totalMeetings}
          </span>
        </div>
      </section>

      <section className="content-card">
        <div className="eyebrow">Фильтр</div>
        <h2>Поиск и фильтр по заседаниям</h2>
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
          <label>
            <span className="eyebrow">Раздел</span>
            <select className="text-input" name="category" defaultValue={category}>
              <option value="">Все разделы</option>
              {meetingCategories.map((item) => (
                <option key={item} value={item}>
                  {formatMeetingRecordCategory(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="eyebrow">Дата</span>
            <input
              className="text-input"
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
            />
          </label>
          <label>
            <span className="eyebrow">Дата</span>
            <input
              className="text-input"
              type="date"
              name="dateTo"
              defaultValue={dateTo}
            />
          </label>
          <div className="pill-row">
            <button className="pill" type="submit">
              Найти
            </button>
            {hasFilters ? (
              <Link className="pill" href="/meetings">
                Сбросить фильтры
              </Link>
            ) : null}
          </div>
        </form>
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
                  {hasFilters
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
