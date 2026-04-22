import assert from "node:assert/strict";
import test from "node:test";

import {
  apiBaseUrl,
  assertCreatedOrOk,
  SessionClient,
  createTextUpload,
  loginAs,
  resetDatabase,
  startManagedProcess
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

test.before(async () => {
  apiServer = await startManagedProcess(
    "api",
    "pnpm",
    ["--filter", "@tk182/api", "start"],
    {
      readyUrl: `${apiBaseUrl}/health`
    }
  );
});

test.after(async () => {
  await apiServer?.stop();
});

test.beforeEach(async () => {
  await resetDatabase();
});

test(
  "auth login/logout/session flow works end-to-end",
  { timeout: 120000 },
  async () => {
    const client = new SessionClient(apiBaseUrl);

    const sessionBefore = await client.requestJson("/auth/session");
    assert.equal(sessionBefore.response.status, 200);
    assert.deepEqual(sessionBefore.data, {
      authenticated: false,
      user: null
    });

    const loginPayload = await loginAs(client, participantCredentials);
    assert.equal(loginPayload.status, "success");
    assert.equal(loginPayload.user.role, "PARTICIPANT");

    const sessionAfter = await client.requestJson("/auth/session");
    assert.equal(sessionAfter.response.status, 200);
    assert.equal(sessionAfter.data.authenticated, true);
    assert.equal(sessionAfter.data.user.email, participantCredentials.email);

    const logout = await client.requestJson("/auth/logout", {
      method: "POST"
    });
    assertCreatedOrOk(logout.response.status, logout.text);
    assert.equal(logout.data.status, "success");

    const sessionAfterLogout = await client.requestJson("/auth/session");
    assert.equal(sessionAfterLogout.response.status, 200);
    assert.deepEqual(sessionAfterLogout.data, {
      authenticated: false,
      user: null
    });
  }
);

test(
  "participant and secretariat access restrictions are enforced",
  { timeout: 120000 },
  async () => {
    const anonymous = new SessionClient(apiBaseUrl);
    const participant = new SessionClient(apiBaseUrl);
    const secretariat = new SessionClient(apiBaseUrl);

    await loginAs(participant, participantCredentials);
    await loginAs(secretariat, secretariatCredentials);

    const anonymousRestricted = await anonymous.requestJson(
      "/approval/participant/cycles"
    );
    assert.equal(anonymousRestricted.response.status, 401);

    const participantCycles = await participant.requestJson("/approval/participant/cycles");
    assert.equal(participantCycles.response.status, 200);
    assert.ok(Array.isArray(participantCycles.data));
    assert.ok(participantCycles.data.length > 0);

    const participantForbidden = await participant.requestJson(
      "/approval/secretariat/cycles"
    );
    assert.equal(participantForbidden.response.status, 403);

    const participantAuditForbidden = await participant.requestJson(
      "/audit/review-cycles/review-cycle-fire-sensors-apr/events"
    );
    assert.equal(participantAuditForbidden.response.status, 403);

    const secretariatCycles = await secretariat.requestJson("/approval/secretariat/cycles");
    assert.equal(secretariatCycles.response.status, 200);
    assert.ok(Array.isArray(secretariatCycles.data));
    assert.ok(secretariatCycles.data.length > 0);

    const secretariatAudit = await secretariat.requestJson(
      "/audit/review-cycles/review-cycle-fire-sensors-apr/events"
    );
    assert.equal(secretariatAudit.response.status, 200);
    assert.ok(Array.isArray(secretariatAudit.data));

    const secretariatForbidden = await secretariat.requestJson(
      "/approval/participant/cycles"
    );
    assert.equal(secretariatForbidden.response.status, 403);
  }
);

test(
  "participant can see assigned review items, create a comment, and submit a final position",
  { timeout: 120000 },
  async () => {
    const participant = new SessionClient(apiBaseUrl);
    const secretariat = new SessionClient(apiBaseUrl);
    await loginAs(participant, participantCredentials);
    await loginAs(secretariat, secretariatCredentials);

    const cyclesResult = await participant.requestJson("/approval/participant/cycles");
    const activeCycle = cyclesResult.data.find(
      (item) => item.cycle.id === "review-cycle-fire-sensors-apr"
    );

    assert.ok(activeCycle, "Expected the active seeded review cycle to be assigned.");

    const draftCard = await participant.requestJson(
      "/approval/participant/cycles/review-cycle-fire-sensors-apr/drafts/draft-standard-fire-sensors"
    );
    assert.equal(draftCard.response.status, 200);
    assert.equal(draftCard.data.draftStandard.code, "ТК182-01-2026");
    assert.ok(draftCard.data.attachments.length > 0);
    assert.ok(
      draftCard.data.attachments.every(
        (attachment) => attachment.visibility === "ASSIGNED_PARTICIPANTS"
      )
    );

    const uniqueMarker = `Автотест-${Date.now()}`;
    const createdComment = await participant.requestJson(
      "/approval/participant/cycles/review-cycle-fire-sensors-apr/drafts/draft-standard-fire-sensors/comments",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sectionRef: "Раздел 9",
          pointRef: "п. 9.1",
          pageRef: "24",
          remark: `${uniqueMarker}: требуется уточнение терминологии`,
          proposedText: "Уточнить термин и добавить ссылку на словарь терминов.",
          rationale: "Это уменьшит неоднозначность при применении проекта стандарта."
        })
      }
    );
    assertCreatedOrOk(createdComment.response.status, createdComment.text);
    assert.equal(createdComment.data.reviewStatus, "RECEIVED");
    assert.match(createdComment.data.remark, /Автотест-/u);

    const positionResult = await participant.requestJson(
      "/approval/participant/cycles/review-cycle-fire-sensors-apr/position",
      {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          position: "AGREED_WITH_COMMENTS",
          note: "Автотест: итоговая позиция отправлена после внесения замечания."
        })
      }
    );
    assert.equal(positionResult.response.status, 200, positionResult.text);
    assert.equal(positionResult.data.position, "AGREED_WITH_COMMENTS");

    const savedPosition = await participant.requestJson(
      "/approval/participant/cycles/review-cycle-fire-sensors-apr/position"
    );
    assert.equal(savedPosition.response.status, 200);
    assert.equal(savedPosition.data.position, "AGREED_WITH_COMMENTS");
    assert.match(savedPosition.data.note, /Автотест/u);

    const auditEvents = await secretariat.requestJson(
      "/audit/review-cycles/review-cycle-fire-sensors-apr/events"
    );
    assert.equal(auditEvents.response.status, 200);
    assert.ok(
      auditEvents.data.some(
        (event) =>
          event.actionType === "COMMENT_CREATED" &&
          event.actorUserId === "user-participant" &&
          event.relatedCommentId === createdComment.data.id
      )
    );
    assert.ok(
      auditEvents.data.some(
        (event) =>
          event.actionType === "POSITION_SUBMITTED" &&
          event.actorUserId === "user-participant" &&
          event.entityType === "PARTICIPANT_POSITION"
      )
    );
  }
);

test(
  "secretariat can update review statuses and control file visibility",
  { timeout: 120000 },
  async () => {
    const secretariat = new SessionClient(apiBaseUrl);
    const participant = new SessionClient(apiBaseUrl);

    await loginAs(secretariat, secretariatCredentials);
    await loginAs(participant, participantCredentials);

    const updatedStatus = await secretariat.requestJson(
      "/approval/secretariat/comments/comment-fire-sensors-ural-1/status",
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          reviewStatus: "NEEDS_CLARIFICATION",
          secretariatResponse: "Автотест: требуется уточнение формулировки замечания."
        })
      }
    );
    assert.equal(updatedStatus.response.status, 200, updatedStatus.text);
    assert.equal(updatedStatus.data.reviewStatus, "NEEDS_CLARIFICATION");
    assert.match(updatedStatus.data.secretariatResponse, /Автотест/u);

    const participantVisibleFormData = createTextUpload(
      "participant-visible-autotest.txt",
      "Файл для участника из автоматического теста"
    );
    participantVisibleFormData.set(
      "description",
      "Автотестовый файл, доступный участнику."
    );
    participantVisibleFormData.set("visibility", "ASSIGNED_PARTICIPANTS");

    const uploadedParticipantFile = await secretariat.requestJson(
      "/approval/secretariat/versions/draft-standard-fire-sensors-v2/files",
      {
        method: "POST",
        body: participantVisibleFormData
      }
    );
    assertCreatedOrOk(uploadedParticipantFile.response.status, uploadedParticipantFile.text);
    assert.equal(uploadedParticipantFile.data.visibility, "ASSIGNED_PARTICIPANTS");

    const secretariatOnlyFormData = createTextUpload(
      "secretariat-only-autotest.txt",
      "Служебный файл секретариата из автоматического теста"
    );
    secretariatOnlyFormData.set(
      "description",
      "Автотестовый файл, доступный только секретариату."
    );
    secretariatOnlyFormData.set("visibility", "SECRETARIAT_ONLY");

    const uploadedSecretariatFile = await secretariat.requestJson(
      "/approval/secretariat/versions/draft-standard-fire-sensors-v2/files",
      {
        method: "POST",
        body: secretariatOnlyFormData
      }
    );
    assertCreatedOrOk(uploadedSecretariatFile.response.status, uploadedSecretariatFile.text);
    assert.equal(uploadedSecretariatFile.data.visibility, "SECRETARIAT_ONLY");

    const secretariatFiles = await secretariat.requestJson(
      "/approval/secretariat/versions/draft-standard-fire-sensors-v2/files"
    );
    assert.equal(secretariatFiles.response.status, 200);
    assert.ok(
      secretariatFiles.data.some(
        (item) => item.id === uploadedParticipantFile.data.id
      )
    );
    assert.ok(
      secretariatFiles.data.some(
        (item) => item.id === uploadedSecretariatFile.data.id
      )
    );

    const participantFiles = await participant.requestJson(
      "/approval/participant/cycles/review-cycle-fire-sensors-apr/drafts/draft-standard-fire-sensors/files"
    );
    assert.equal(participantFiles.response.status, 200);
    assert.ok(
      participantFiles.data.some((item) => item.id === uploadedParticipantFile.data.id)
    );
    assert.ok(
      participantFiles.data.every((item) => item.id !== uploadedSecretariatFile.data.id)
    );

    const participantDownload = await participant.request(
      `/approval/participant/cycles/review-cycle-fire-sensors-apr/drafts/draft-standard-fire-sensors/files/${uploadedParticipantFile.data.id}/download`
    );
    const participantDownloadText = await participantDownload.text();
    assert.equal(participantDownload.status, 200);
    assert.match(participantDownloadText, /участника/u);

    const forbiddenDownload = await participant.requestJson(
      `/approval/participant/cycles/review-cycle-fire-sensors-apr/drafts/draft-standard-fire-sensors/files/${uploadedSecretariatFile.data.id}/download`
    );
    assert.equal(forbiddenDownload.response.status, 404);

    const auditEvents = await secretariat.requestJson(
      "/audit/review-cycles/review-cycle-fire-sensors-apr/events"
    );
    assert.equal(auditEvents.response.status, 200);
    assert.ok(
      auditEvents.data.some(
        (event) =>
          event.actionType === "COMMENT_STATUS_CHANGED" &&
          event.actorUserId === "user-secretariat" &&
          event.relatedCommentId === "comment-fire-sensors-ural-1"
      )
    );
    assert.ok(
      auditEvents.data.some(
        (event) =>
          event.actionType === "SECRETARIAT_RESPONSE_UPDATED" &&
          event.actorUserId === "user-secretariat" &&
          event.relatedCommentId === "comment-fire-sensors-ural-1"
      )
    );
    assert.ok(
      auditEvents.data.some(
        (event) =>
          event.actionType === "FILE_UPLOADED" &&
          event.actorUserId === "user-secretariat" &&
          event.relatedFileId === uploadedParticipantFile.data.id
      )
    );
  }
);
