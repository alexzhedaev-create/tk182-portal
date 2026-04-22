import assert from "node:assert/strict";
import test from "node:test";

import {
  apiBaseUrl,
  loginAs,
  resetDatabase,
  SessionClient,
  startManagedProcess,
  webBaseUrl
} from "./helpers.mjs";

const participantCredentials = {
  email: "participant@tk182.local",
  password: "ParticipantPass123!"
};

const secretariatCredentials = {
  email: "secretariat@tk182.local",
  password: "SecretariatPass123!"
};

let apiServer;
let webServer;

test.before(async () => {
  await resetDatabase();

  apiServer = await startManagedProcess(
    "api",
    "pnpm",
    ["--filter", "@tk182/api", "start"],
    {
      readyUrl: `${apiBaseUrl}/health`
    }
  );
  webServer = await startManagedProcess(
    "web",
    "pnpm",
    ["--filter", "@tk182/web", "start"],
    {
      readyUrl: `${webBaseUrl}/login`,
      validate: async (response) => {
        if (!response.ok) {
          return false;
        }

        const html = await response.text();
        return /Вход в рабочие кабинеты/u.test(html);
      }
    }
  );
});

test.after(async () => {
  await webServer?.stop();
  await apiServer?.stop();
});

test(
  "next start stays stable and serves the current Russian MVP pages",
  { timeout: 120000 },
  async () => {
    const participant = new SessionClient(apiBaseUrl);
    const secretariat = new SessionClient(apiBaseUrl);

    await loginAs(participant, participantCredentials);
    await loginAs(secretariat, secretariatCredentials);

    const loginPage = await fetch(`${webBaseUrl}/login`);
    const loginHtml = await loginPage.text();
    assert.equal(loginPage.status, 200);
    assert.match(loginHtml, /Вход в рабочие кабинеты/u);
    assert.match(loginHtml, /Портал ТК 182/u);

    const aboutPage = await fetch(`${webBaseUrl}/about`);
    const aboutHtml = await aboutPage.text();
    assert.equal(aboutPage.status, 200);
    assert.match(aboutHtml, /Руководство ТК 182/u);
    assert.match(aboutHtml, /Яковлев Сергей Викторович/u);
    assert.match(aboutHtml, /ПК 7/u);

    const newsPage = await fetch(`${webBaseUrl}/news`);
    const newsHtml = await newsPage.text();
    assert.equal(newsPage.status, 200);
    assert.match(newsHtml, /Новости/u);
    assert.match(newsHtml, /новый публичный контур публикаций/u);
    assert.match(newsHtml, /Открыть новость/u);

    const filteredNewsPage = await fetch(
      `${webBaseUrl}/news?q=%D0%BA%D0%BE%D0%BD%D1%82%D1%83%D1%80&dateFrom=2026-04-18&dateTo=2026-04-18`
    );
    const filteredNewsHtml = await filteredNewsPage.text();
    assert.equal(filteredNewsPage.status, 200);
    assert.match(filteredNewsHtml, /Найдено новостей/u);
    assert.match(filteredNewsHtml, /Сбросить фильтры/u);

    const newsDetailPage = await fetch(`${webBaseUrl}/news/news-portal-content-launch`);
    const newsDetailHtml = await newsDetailPage.text();
    assert.equal(newsDetailPage.status, 200);
    assert.match(newsDetailHtml, /Текст публикации/u);
    assert.match(newsDetailHtml, /новый публичный контур публикаций/u);

    const documentsPage = await fetch(`${webBaseUrl}/documents`);
    const documentsHtml = await documentsPage.text();
    assert.equal(documentsPage.status, 200);
    assert.match(documentsHtml, /Основные документы/u);
    assert.match(documentsHtml, /Положение о ТК 182/u);
    assert.match(documentsHtml, /Скачать/u);
    assert.match(documentsHtml, /Открыть карточку/u);

    const filteredDocumentsPage = await fetch(
      `${webBaseUrl}/documents?q=%D0%9F%D0%BE%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5&category=MAIN_DOCUMENTS&dateFrom=2026-01-01&dateTo=2026-01-31`
    );
    const filteredDocumentsHtml = await filteredDocumentsPage.text();
    assert.equal(filteredDocumentsPage.status, 200);
    assert.match(filteredDocumentsHtml, /Найдено документов/u);
    assert.match(filteredDocumentsHtml, /Положение о ТК 182/u);
    assert.ok(!/Отчет о работе ТК 182 за 2025 год/u.test(filteredDocumentsHtml));

    const documentDetailPage = await fetch(
      `${webBaseUrl}/documents/public-document-main-regulation`
    );
    const documentDetailHtml = await documentDetailPage.text();
    assert.equal(documentDetailPage.status, 200);
    assert.match(documentDetailHtml, /Файл документа/u);
    assert.match(documentDetailHtml, /Основные сведения/u);
    assert.match(documentDetailHtml, /Polozhenie_o_TK_182\.txt/u);

    const meetingsPage = await fetch(`${webBaseUrl}/meetings`);
    const meetingsHtml = await meetingsPage.text();
    assert.equal(meetingsPage.status, 200);
    assert.match(meetingsHtml, /Заседания/u);
    assert.match(meetingsHtml, /Уведомление и повестка заседания ТК 182/u);
    assert.match(meetingsHtml, /Протокол заседания ТК 182/u);

    const filteredMeetingsPage = await fetch(
      `${webBaseUrl}/meetings?q=%D0%BF%D0%BE%D0%B2%D0%B5%D1%81%D1%82%D0%BA%D0%B0&category=MEETING_AGENDA&dateFrom=2026-04-01&dateTo=2026-04-30`
    );
    const filteredMeetingsHtml = await filteredMeetingsPage.text();
    assert.equal(filteredMeetingsPage.status, 200);
    assert.match(filteredMeetingsHtml, /Найдено записей/u);
    assert.match(filteredMeetingsHtml, /Уведомление и повестка заседания ТК 182/u);
    assert.ok(!/Протокол заседания ТК 182/u.test(filteredMeetingsHtml));

    const meetingDetailPage = await fetch(`${webBaseUrl}/meetings/meeting-agenda-q2-2026`);
    const meetingDetailHtml = await meetingDetailPage.text();
    assert.equal(meetingDetailPage.status, 200);
    assert.match(meetingDetailHtml, /Сведения о заседании/u);
    assert.match(meetingDetailHtml, /Место проведения/u);
    assert.match(meetingDetailHtml, /Содержание/u);

    const standardsPage = await fetch(`${webBaseUrl}/standards`);
    const standardsHtml = await standardsPage.text();
    assert.equal(standardsPage.status, 200);
    assert.match(standardsHtml, /Утвержденные стандарты/u);
    assert.match(standardsHtml, /Программа разработки национальных стандартов/u);
    assert.match(standardsHtml, /ПК 5/u);
    assert.match(standardsHtml, /ТК182-01-2026/u);
    assert.match(standardsHtml, /ГОСТ Р 70518-2025/u);

    const filteredStandardsPage = await fetch(
      `${webBaseUrl}/standards?q=70518&section=APPROVED_STANDARDS&responsibleSubcommitteeId=subcommittee-pk5&dateFrom=2026-02-01&dateTo=2026-02-28`
    );
    const filteredStandardsHtml = await filteredStandardsPage.text();
    assert.equal(filteredStandardsPage.status, 200);
    assert.match(filteredStandardsHtml, /Найдено:/u);
    assert.match(filteredStandardsHtml, /ГОСТ Р 70518-2025/u);
    assert.ok(!/ГОСТ Р 70501-2025/u.test(filteredStandardsHtml));

    const standardDetailPage = await fetch(
      `${webBaseUrl}/standards/approved-standard-ndt-2025`
    );
    const standardDetailHtml = await standardDetailPage.text();
    assert.equal(standardDetailPage.status, 200);
    assert.match(standardDetailHtml, /Сведения о стандарте/u);
    assert.match(standardDetailHtml, /Ответственный подкомитет/u);
    assert.match(standardDetailHtml, /ГОСТ Р 70518-2025/u);

    const organizationsPage = await fetch(`${webBaseUrl}/organizations`);
    const organizationsHtml = await organizationsPage.text();
    assert.equal(organizationsPage.status, 200);
    assert.match(organizationsHtml, /Организации/u);
    assert.match(organizationsHtml, /Наука и инновации/u);

    const participantPage = await fetch(
      `${webBaseUrl}/participant/reviews/review-cycle-fire-sensors-apr/draft-standard-fire-sensors`,
      {
        headers: {
          cookie: participant.getCookieHeader()
        }
      }
    );
    const participantHtml = await participantPage.text();
    assert.equal(participantPage.status, 200);
    assert.match(participantHtml, /Файлы версии/u);
    assert.match(participantHtml, /Скачать/u);
    assert.match(participantHtml, /Описание основного документа/u);
    assert.match(participantHtml, /Ответственный подкомитет/u);
    assert.match(participantHtml, /ПК 5/u);

    const secretariatPage = await fetch(
      `${webBaseUrl}/secretariat/cycles/review-cycle-fire-sensors-apr`,
      {
        headers: {
          cookie: secretariat.getCookieHeader()
        }
      }
    );
    const secretariatHtml = await secretariatPage.text();
    assert.equal(secretariatPage.status, 200);
    assert.match(secretariatHtml, /Файлы версии/u);
    assert.match(secretariatHtml, /Загрузить файл/u);
    assert.match(secretariatHtml, /Видимость/u);
    assert.match(secretariatHtml, /Ответственный подкомитет/u);

    const committeeBackofficePage = await fetch(`${webBaseUrl}/secretariat/committee`, {
      headers: {
        cookie: secretariat.getCookieHeader()
      }
    });
    const committeeBackofficeHtml = await committeeBackofficePage.text();
    assert.equal(committeeBackofficePage.status, 200);
    assert.match(committeeBackofficeHtml, /Структура ТК 182/u);
    assert.match(committeeBackofficeHtml, /Руководство ТК и секретариат/u);
    assert.match(committeeBackofficeHtml, /Журнал изменений структуры/u);

    const contentBackofficePage = await fetch(`${webBaseUrl}/secretariat/content`, {
      headers: {
        cookie: secretariat.getCookieHeader()
      }
    });
    const contentBackofficeHtml = await contentBackofficePage.text();
    assert.equal(contentBackofficePage.status, 200);
    assert.match(contentBackofficeHtml, /Контент портала/u);
    assert.match(contentBackofficeHtml, /Публичные документы/u);
    assert.match(contentBackofficeHtml, /Утвержденные стандарты/u);
    assert.match(contentBackofficeHtml, /Реестр материалов старого сайта/u);
    assert.match(contentBackofficeHtml, /Создано в портале/u);
    assert.match(contentBackofficeHtml, /Создать документ/u);
    assert.match(contentBackofficeHtml, /Журнал изменений контента/u);
  }
);
