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
  }
);
