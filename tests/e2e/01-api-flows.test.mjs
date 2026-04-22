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

    const anonymousNotifications = await anonymous.requestJson("/notifications");
    assert.equal(anonymousNotifications.response.status, 401);

    const participantCycles = await participant.requestJson("/approval/participant/cycles");
    assert.equal(participantCycles.response.status, 200);
    assert.ok(Array.isArray(participantCycles.data));
    assert.ok(participantCycles.data.length > 0);

    const participantNotifications = await participant.requestJson("/notifications");
    assert.equal(participantNotifications.response.status, 200);
    assert.ok(Array.isArray(participantNotifications.data));
    assert.ok(participantNotifications.data.length > 0);

    const participantForbidden = await participant.requestJson(
      "/approval/secretariat/cycles"
    );
    assert.equal(participantForbidden.response.status, 403);

    const participantAuditForbidden = await participant.requestJson(
      "/audit/review-cycles/review-cycle-fire-sensors-apr/events"
    );
    assert.equal(participantAuditForbidden.response.status, 403);

    const participantCommitteeBackofficeForbidden = await participant.requestJson(
      "/committee/backoffice"
    );
    assert.equal(participantCommitteeBackofficeForbidden.response.status, 403);

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
  "seeded TK 182 structure and standard-to-subcommittee links are available",
  { timeout: 120000 },
  async () => {
    const publicClient = new SessionClient(apiBaseUrl);

    const committee = await publicClient.requestJson("/committee");
    assert.equal(committee.response.status, 200);
    assert.equal(committee.data.leadership.length, 2);
    assert.equal(committee.data.subcommittees.length, 7);
    assert.equal(
      committee.data.secretariatHostOrganization.name,
      'НИЦ "Курчатовский институт" - ВИАМ'
    );
    assert.ok(
      committee.data.leadership.some(
        (item) => item.person.fullName === "Яковлев Сергей Викторович"
      )
    );
    assert.ok(
      committee.data.subcommittees.some(
        (item) =>
          item.code === "ПК 5" &&
          /Неразрушающий контроль/u.test(item.title)
      )
    );

    const standards = await publicClient.requestJson("/standards");
    assert.equal(standards.response.status, 200);
    assert.ok(Array.isArray(standards.data));
    const fireSensors = standards.data.find(
      (item) => item.id === "draft-standard-fire-sensors"
    );
    assert.ok(fireSensors);
    assert.equal(fireSensors.responsibleSubcommittee.code, "ПК 5");
    assert.match(
      fireSensors.responsibleSubcommittee.title,
      /Неразрушающий контроль/u
    );
  }
);

test(
  "secretariat can create public content and published items become visible on public endpoints",
  { timeout: 120000 },
  async () => {
    const publicClient = new SessionClient(apiBaseUrl);
    const secretariat = new SessionClient(apiBaseUrl);
    await loginAs(secretariat, secretariatCredentials);

    const marker = `${Date.now()}`;

    const seededNews = await publicClient.requestJson("/news");
    assert.equal(seededNews.response.status, 200);
    assert.ok(Array.isArray(seededNews.data));
    assert.ok(
      seededNews.data.some((item) => item.id === "news-portal-content-launch")
    );

    const seededDocuments = await publicClient.requestJson("/documents");
    assert.equal(seededDocuments.response.status, 200);
    assert.ok(Array.isArray(seededDocuments.data.sections));
    assert.ok(
      seededDocuments.data.sections.some(
        (section) =>
          section.category === "MAIN_DOCUMENTS" &&
          section.documents.some((document) => document.id === "public-document-main-regulation")
      )
    );

    const seededMeetings = await publicClient.requestJson("/meetings");
    assert.equal(seededMeetings.response.status, 200);
    assert.ok(Array.isArray(seededMeetings.data.sections));
    assert.ok(
      seededMeetings.data.sections.some(
        (section) =>
          section.category === "MEETING_AGENDA" &&
          section.meetings.some((meeting) => meeting.id === "meeting-agenda-q2-2026")
      )
    );

    const seededStandards = await publicClient.requestJson("/standards/public-content");
    assert.equal(seededStandards.response.status, 200);
    assert.ok(
      seededStandards.data.approvedStandards.some(
        (item) => item.id === "approved-standard-ndt-2025"
      )
    );
    assert.ok(
      seededStandards.data.nationalStandardsProgramDocuments.some(
        (item) => item.id === "public-document-national-program-2026"
      )
    );

    const createdNews = await secretariat.requestJson("/news/backoffice", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: `Новость для API-теста ${marker}`,
        excerpt: `Краткое описание новости ${marker}`,
        body: `Полный текст новости ${marker}`,
        publicationDate: "2026-04-22T09:00:00.000Z"
      })
    });
    assertCreatedOrOk(createdNews.response.status, createdNews.text);
    assert.equal(createdNews.data.status, "draft");

    const newsBeforePublish = await publicClient.requestJson("/news");
    assert.equal(newsBeforePublish.response.status, 200);
    assert.ok(
      !newsBeforePublish.data.some((item) => item.id === createdNews.data.id)
    );

    const publishedNews = await secretariat.requestJson(
      `/news/backoffice/${createdNews.data.id}/publish`,
      {
        method: "POST"
      }
    );
    assertCreatedOrOk(publishedNews.response.status, publishedNews.text);
    assert.equal(publishedNews.data.status, "published");

    const newsAfterPublish = await publicClient.requestJson("/news");
    assert.equal(newsAfterPublish.response.status, 200);
    assert.ok(
      newsAfterPublish.data.some((item) => item.id === createdNews.data.id)
    );

    const documentForm = createTextUpload(
      `api-public-document-${marker}.txt`,
      `Содержимое документа ${marker}`
    );
    documentForm.set("title", `Документ для API-теста ${marker}`);
    documentForm.set("summary", `Описание документа ${marker}`);
    documentForm.set("category", "MAIN_DOCUMENTS");
    documentForm.set("publicationDate", "2026-04-22T10:00:00.000Z");
    documentForm.set("fileDescription", `Файл документа ${marker}`);

    const createdDocument = await secretariat.requestJson("/documents/backoffice", {
      method: "POST",
      body: documentForm
    });
    assertCreatedOrOk(createdDocument.response.status, createdDocument.text);
    assert.equal(createdDocument.data.status, "draft");

    const publishedDocument = await secretariat.requestJson(
      `/documents/backoffice/${createdDocument.data.id}/publish`,
      {
        method: "POST"
      }
    );
    assertCreatedOrOk(publishedDocument.response.status, publishedDocument.text);
    assert.equal(publishedDocument.data.status, "published");

    const documentsAfterPublish = await publicClient.requestJson("/documents");
    assert.equal(documentsAfterPublish.response.status, 200);
    assert.ok(
      documentsAfterPublish.data.sections.some((section) =>
        section.documents.some((document) => document.id === createdDocument.data.id)
      )
    );

    const meetingForm = createTextUpload(
      `api-meeting-${marker}.txt`,
      `Приложение к записи заседания ${marker}`
    );
    meetingForm.set("title", `Заседание для API-теста ${marker}`);
    meetingForm.set("summary", `Краткое описание заседания ${marker}`);
    meetingForm.set("body", `Подробное содержание заседания ${marker}`);
    meetingForm.set("location", "Москва");
    meetingForm.set("category", "MEETING_MINUTES");
    meetingForm.set("meetingDate", "2026-04-22T11:00:00.000Z");
    meetingForm.set("publicationDate", "2026-04-22T12:00:00.000Z");
    meetingForm.set("fileDescription", `Файл заседания ${marker}`);

    const createdMeeting = await secretariat.requestJson("/meetings/backoffice", {
      method: "POST",
      body: meetingForm
    });
    assertCreatedOrOk(createdMeeting.response.status, createdMeeting.text);
    assert.equal(createdMeeting.data.status, "draft");

    const publishedMeeting = await secretariat.requestJson(
      `/meetings/backoffice/${createdMeeting.data.id}/publish`,
      {
        method: "POST"
      }
    );
    assertCreatedOrOk(publishedMeeting.response.status, publishedMeeting.text);
    assert.equal(publishedMeeting.data.status, "published");

    const meetingsAfterPublish = await publicClient.requestJson("/meetings");
    assert.equal(meetingsAfterPublish.response.status, 200);
    assert.ok(
      meetingsAfterPublish.data.sections.some((section) =>
        section.meetings.some((meeting) => meeting.id === createdMeeting.data.id)
      )
    );

    const approvedStandardForm = createTextUpload(
      `api-approved-standard-${marker}.txt`,
      `Файл утвержденного стандарта ${marker}`
    );
    approvedStandardForm.set("code", `ГОСТ Р API-${marker}`);
    approvedStandardForm.set("title", `Утвержденный стандарт API ${marker}`);
    approvedStandardForm.set("summary", `Описание утвержденного стандарта ${marker}`);
    approvedStandardForm.set("approvalDate", "2026-04-01T00:00:00.000Z");
    approvedStandardForm.set("publicationDate", "2026-04-22T13:00:00.000Z");
    approvedStandardForm.set("responsibleSubcommitteeId", "subcommittee-pk3");
    approvedStandardForm.set("fileDescription", `Файл стандарта ${marker}`);

    const createdApprovedStandard = await secretariat.requestJson(
      "/standards/backoffice/approved",
      {
        method: "POST",
        body: approvedStandardForm
      }
    );
    assertCreatedOrOk(createdApprovedStandard.response.status, createdApprovedStandard.text);
    assert.equal(createdApprovedStandard.data.status, "draft");

    const publishedApprovedStandard = await secretariat.requestJson(
      `/standards/backoffice/approved/${createdApprovedStandard.data.id}/publish`,
      {
        method: "POST"
      }
    );
    assertCreatedOrOk(
      publishedApprovedStandard.response.status,
      publishedApprovedStandard.text
    );
    assert.equal(publishedApprovedStandard.data.status, "published");

    const standardsAfterPublish = await publicClient.requestJson("/standards/public-content");
    assert.equal(standardsAfterPublish.response.status, 200);
    assert.ok(
      standardsAfterPublish.data.approvedStandards.some(
        (item) => item.id === createdApprovedStandard.data.id
      )
    );
  }
);

test(
  "secretariat can manage committee structure and public committee data reflects changes",
  { timeout: 120000 },
  async () => {
    const secretariat = new SessionClient(apiBaseUrl);
    await loginAs(secretariat, secretariatCredentials);

    const marker = `${Date.now()}`;
    const organizationName = `Автотестовая организация ТК 182 ${marker}`;
    const updatedOrganizationName = `${organizationName} (обновлено)`;
    const shortName = `АТК-${marker}`;
    const updatedShortName = `АТКО-${marker}`;
    const personName = `Автотестов Андрей ${marker}`;
    const updatedJobTitle = "Руководитель направления стандартизации автотестов";
    const createdSubcommitteeCode = `ПК AUTO ${marker}`;
    const updatedSubcommitteeTitle = `Автотестовый подкомитет ${marker} (обновлено)`;

    const backofficeBefore = await secretariat.requestJson("/committee/backoffice");
    assert.equal(backofficeBefore.response.status, 200);
    assert.ok(Array.isArray(backofficeBefore.data.roles));
    assert.ok(Array.isArray(backofficeBefore.data.subcommittees));

    const createdOrganization = await secretariat.requestJson(
      "/committee/backoffice/organizations",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: organizationName,
          shortName,
          countryCode: "RU"
        })
      }
    );
    assertCreatedOrOk(createdOrganization.response.status, createdOrganization.text);
    assert.equal(createdOrganization.data.name, organizationName);

    const updatedOrganization = await secretariat.requestJson(
      `/committee/backoffice/organizations/${createdOrganization.data.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: updatedOrganizationName,
          shortName: updatedShortName,
          countryCode: "RU"
        })
      }
    );
    assert.equal(updatedOrganization.response.status, 200);
    assert.equal(updatedOrganization.data.name, updatedOrganizationName);
    assert.equal(updatedOrganization.data.shortName, updatedShortName);

    const createdPerson = await secretariat.requestJson("/committee/backoffice/people", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        fullName: personName,
        jobTitle: "Главный эксперт по автотестам",
        organizationId: createdOrganization.data.id
      })
    });
    assertCreatedOrOk(createdPerson.response.status, createdPerson.text);
    assert.equal(createdPerson.data.fullName, personName);
    assert.equal(createdPerson.data.organizationId, createdOrganization.data.id);

    const updatedPerson = await secretariat.requestJson(
      `/committee/backoffice/people/${createdPerson.data.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          fullName: personName,
          jobTitle: updatedJobTitle,
          organizationId: createdOrganization.data.id
        })
      }
    );
    assert.equal(updatedPerson.response.status, 200);
    assert.equal(updatedPerson.data.jobTitle, updatedJobTitle);

    const roles = await secretariat.requestJson("/committee/backoffice/roles");
    assert.equal(roles.response.status, 200);
    const deputyRole = roles.data.find((role) => role.code === "DEPUTY_CO_CHAIR");
    assert.ok(deputyRole);

    const createdRoleAssignment = await secretariat.requestJson(
      "/committee/backoffice/role-assignments",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          personId: createdPerson.data.id,
          roleId: deputyRole.id,
          sortOrder: 90
        })
      }
    );
    assertCreatedOrOk(
      createdRoleAssignment.response.status,
      createdRoleAssignment.text
    );
    assert.equal(createdRoleAssignment.data.person.fullName, personName);
    assert.equal(createdRoleAssignment.data.role.code, "DEPUTY_CO_CHAIR");

    const createdSubcommittee = await secretariat.requestJson(
      "/committee/backoffice/subcommittees",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          code: createdSubcommitteeCode,
          title: `Автотестовый подкомитет ${marker}`,
          hostOrganizationId: createdOrganization.data.id
        })
      }
    );
    assertCreatedOrOk(createdSubcommittee.response.status, createdSubcommittee.text);
    assert.equal(createdSubcommittee.data.code, createdSubcommitteeCode);

    const updatedSubcommittee = await secretariat.requestJson(
      `/committee/backoffice/subcommittees/${createdSubcommittee.data.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          code: createdSubcommitteeCode,
          title: updatedSubcommitteeTitle,
          hostOrganizationId: createdOrganization.data.id
        })
      }
    );
    assert.equal(updatedSubcommittee.response.status, 200);
    assert.equal(updatedSubcommittee.data.title, updatedSubcommitteeTitle);

    const backofficeAfter = await secretariat.requestJson("/committee/backoffice");
    assert.equal(backofficeAfter.response.status, 200);
    assert.ok(
      backofficeAfter.data.organizations.some(
        (organization) => organization.id === createdOrganization.data.id
      )
    );
    assert.ok(
      backofficeAfter.data.people.some((person) => person.id === createdPerson.data.id)
    );
    assert.ok(
      backofficeAfter.data.roleAssignments.some(
        (assignment) => assignment.id === createdRoleAssignment.data.id
      )
    );
    assert.ok(
      backofficeAfter.data.subcommittees.some(
        (subcommittee) => subcommittee.id === createdSubcommittee.data.id
      )
    );

    const publicStructure = await secretariat.requestJson("/committee");
    assert.equal(publicStructure.response.status, 200);
    assert.ok(
      publicStructure.data.deputyCoChairs.some(
        (item) => item.person.fullName === personName && item.person.jobTitle === updatedJobTitle
      )
    );
    assert.ok(
      publicStructure.data.organizations.some(
        (organization) =>
          organization.name === updatedOrganizationName &&
          organization.hostedSubcommittees.some(
            (subcommittee) => subcommittee.id === createdSubcommittee.data.id
          )
      )
    );
    assert.ok(
      publicStructure.data.subcommittees.some(
        (subcommittee) =>
          subcommittee.id === createdSubcommittee.data.id &&
          subcommittee.title === updatedSubcommitteeTitle
      )
    );

    const committeeAudit = await secretariat.requestJson("/audit/committee/events");
    assert.equal(committeeAudit.response.status, 200);
    assert.ok(
      committeeAudit.data.some(
        (event) =>
          event.actionType === "COMMITTEE_ORGANIZATION_CREATED" &&
          event.entityId === createdOrganization.data.id
      )
    );
    assert.ok(
      committeeAudit.data.some(
        (event) =>
          event.actionType === "COMMITTEE_PERSON_UPDATED" &&
          event.entityId === createdPerson.data.id
      )
    );
    assert.ok(
      committeeAudit.data.some(
        (event) =>
          event.actionType === "COMMITTEE_ROLE_ASSIGNMENT_CREATED" &&
          event.entityId === createdRoleAssignment.data.id
      )
    );
    assert.ok(
      committeeAudit.data.some(
        (event) =>
          event.actionType === "SUBCOMMITTEE_UPDATED" &&
          event.entityId === createdSubcommittee.data.id
      )
    );
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
    assert.equal(draftCard.data.draftStandard.responsibleSubcommittee.code, "ПК 5");
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

    const participantNotifications = await participant.requestJson("/notifications");
    assert.equal(participantNotifications.response.status, 200);
    assert.ok(
      participantNotifications.data.some(
        (notification) =>
          notification.type === "FINAL_POSITION_SUBMITTED" &&
          notification.relatedCycleId === "review-cycle-fire-sensors-apr"
      )
    );

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

    const unreadBeforeRead = await participant.requestJson("/notifications/unread-count");
    assert.equal(unreadBeforeRead.response.status, 200);
    assert.ok(unreadBeforeRead.data.unreadCount >= 3);

    const participantNotifications = await participant.requestJson("/notifications");
    assert.equal(participantNotifications.response.status, 200);

    const statusNotification = participantNotifications.data.find(
      (notification) =>
        notification.type === "COMMENT_STATUS_CHANGED" &&
        notification.relatedCommentId === "comment-fire-sensors-ural-1"
    );
    const responseNotification = participantNotifications.data.find(
      (notification) =>
        notification.type === "SECRETARIAT_RESPONSE_UPDATED" &&
        notification.relatedCommentId === "comment-fire-sensors-ural-1"
    );
    const fileNotification = participantNotifications.data.find(
      (notification) =>
        notification.type === "VERSION_FILE_UPLOADED" &&
        notification.relatedFileId === uploadedParticipantFile.data.id
    );

    assert.ok(statusNotification);
    assert.match(statusNotification.message, /Нужно уточнение/u);
    assert.ok(responseNotification);
    assert.ok(fileNotification);
    assert.match(fileNotification.message, /participant-visible-autotest\.txt/u);

    const markedRead = await participant.requestJson(
      `/notifications/${statusNotification.id}/read`,
      {
        method: "POST"
      }
    );
    assertCreatedOrOk(markedRead.response.status, markedRead.text);
    assert.ok(markedRead.data.readAt);

    const unreadAfterSingleRead = await participant.requestJson(
      "/notifications/unread-count"
    );
    assert.equal(unreadAfterSingleRead.response.status, 200);
    assert.equal(
      unreadAfterSingleRead.data.unreadCount,
      unreadBeforeRead.data.unreadCount - 1
    );

    const markedAllRead = await participant.requestJson("/notifications/read-all", {
      method: "POST"
    });
    assertCreatedOrOk(markedAllRead.response.status, markedAllRead.text);
    assert.equal(markedAllRead.data.status, "success");
    assert.ok(markedAllRead.data.updatedCount >= 1);

    const unreadAfterAll = await participant.requestJson("/notifications/unread-count");
    assert.equal(unreadAfterAll.response.status, 200);
    assert.equal(unreadAfterAll.data.unreadCount, 0);

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

test(
  "secretariat backoffice can create a project, version, cycle, assignment, and open it for a participant",
  { timeout: 120000 },
  async () => {
    const secretariat = new SessionClient(apiBaseUrl);
    const participant = new SessionClient(apiBaseUrl);
    await loginAs(secretariat, secretariatCredentials);
    await loginAs(participant, participantCredentials);

    const uniqueMarker = `${Date.now()}`;
    const draftCode = `ТК182-AUTO-${uniqueMarker}`;
    const draftTitle = `Автотестовый проект стандарта ${uniqueMarker}`;
    const cycleTitle = `Автотестовый цикл ${uniqueMarker}`;

    const createdDraftStandard = await secretariat.requestJson(
      "/approval/secretariat/draft-standards",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          code: draftCode,
          title: draftTitle,
          summary: "Автотестовое описание проекта стандарта для проверки backoffice-flow.",
          stage: "Подготовка",
          responsibleSubcommitteeId: "subcommittee-pk7"
        })
      }
    );
    assertCreatedOrOk(
      createdDraftStandard.response.status,
      createdDraftStandard.text
    );
    assert.equal(createdDraftStandard.data.draftStandard.code, draftCode);
    assert.equal(
      createdDraftStandard.data.draftStandard.responsibleSubcommittee.code,
      "ПК 7"
    );
    const draftStandardId = createdDraftStandard.data.draftStandard.id;

    const createdVersion = await secretariat.requestJson(
      `/approval/secretariat/draft-standards/${draftStandardId}/versions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          versionLabel: "Редакция 0.1",
          revisionSummary: "Автотестовая первая редакция для нового проекта.",
          fileName: `autotest-${uniqueMarker}.docx`,
          fileNote: "Основной файл автотестовой версии.",
          publishedAt: "2026-04-22T10:00:00.000Z"
        })
      }
    );
    assertCreatedOrOk(createdVersion.response.status, createdVersion.text);
    assert.equal(createdVersion.data.versionLabel, "Редакция 0.1");

    const createdCycle = await secretariat.requestJson(
      `/approval/secretariat/draft-standards/${draftStandardId}/cycles`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          draftStandardVersionId: createdVersion.data.id,
          title: cycleTitle,
          description: "Автотестовый цикл согласования для проверки назначения.",
          opensAt: "2026-04-22T10:00:00.000Z",
          deadlineAt: "2026-05-22T10:00:00.000Z"
        })
      }
    );
    assertCreatedOrOk(createdCycle.response.status, createdCycle.text);
    assert.equal(createdCycle.data.cycle.cycle.status, "draft");
    const cycleId = createdCycle.data.cycle.cycle.id;

    const initialAssignments = await secretariat.requestJson(
      `/approval/secretariat/cycles/${cycleId}/assignments`
    );
    assert.equal(initialAssignments.response.status, 200);
    assert.equal(initialAssignments.data.length, 0);

    const createdAssignment = await secretariat.requestJson(
      `/approval/secretariat/cycles/${cycleId}/assignments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          userId: "user-participant",
          organizationId: "org-ural-techmash"
        })
      }
    );
    assertCreatedOrOk(createdAssignment.response.status, createdAssignment.text);
    assert.equal(createdAssignment.data.userId, "user-participant");
    assert.equal(createdAssignment.data.organizationId, "org-ural-techmash");

    const activatedCycle = await secretariat.requestJson(
      `/approval/secretariat/cycles/${cycleId}/activate`,
      {
        method: "POST"
      }
    );
    assertCreatedOrOk(activatedCycle.response.status, activatedCycle.text);
    assert.equal(activatedCycle.data.cycle.cycle.status, "open");

    const participantCycles = await participant.requestJson("/approval/participant/cycles");
    assert.equal(participantCycles.response.status, 200);
    const createdParticipantCycle = participantCycles.data.find(
      (item) => item.cycle.id === cycleId
    );
    assert.ok(createdParticipantCycle);
    assert.equal(createdParticipantCycle.draftStandard.id, draftStandardId);
    assert.equal(createdParticipantCycle.draftStandard.title, draftTitle);
    assert.equal(
      createdParticipantCycle.draftStandard.responsibleSubcommittee.code,
      "ПК 7"
    );

    const participantDraftCard = await participant.requestJson(
      `/approval/participant/cycles/${cycleId}/drafts/${draftStandardId}`
    );
    assert.equal(participantDraftCard.response.status, 200);
    assert.equal(participantDraftCard.data.currentVersion.id, createdVersion.data.id);
    assert.equal(participantDraftCard.data.draftStandard.title, draftTitle);
    assert.equal(
      participantDraftCard.data.draftStandard.responsibleSubcommittee.code,
      "ПК 7"
    );

    const participantNotifications = await participant.requestJson("/notifications");
    assert.equal(participantNotifications.response.status, 200);
    assert.ok(
      participantNotifications.data.some(
        (notification) =>
          notification.type === "ASSIGNED_TO_ACTIVE_CYCLE" &&
          notification.relatedCycleId === cycleId
      )
    );

    const draftAudit = await secretariat.requestJson(
      `/audit/draft-standards/${draftStandardId}/events`
    );
    assert.equal(draftAudit.response.status, 200);
    assert.ok(
      draftAudit.data.some(
        (event) =>
          event.actionType === "DRAFT_STANDARD_CREATED" &&
          event.entityType === "DRAFT_STANDARD"
      )
    );
    assert.ok(
      draftAudit.data.some(
        (event) =>
          event.actionType === "VERSION_CREATED" &&
          event.entityType === "DRAFT_STANDARD_VERSION"
      )
    );
    assert.ok(
      draftAudit.data.some(
        (event) =>
          event.actionType === "REVIEW_CYCLE_CREATED" &&
          event.entityType === "REVIEW_CYCLE" &&
          event.relatedCycleId === cycleId
      )
    );

    const cycleAudit = await secretariat.requestJson(
      `/audit/review-cycles/${cycleId}/events`
    );
    assert.equal(cycleAudit.response.status, 200);
    assert.ok(
      cycleAudit.data.some(
        (event) =>
          event.actionType === "REVIEW_ASSIGNMENT_CREATED" &&
          event.entityType === "REVIEW_ASSIGNMENT"
      )
    );
    assert.ok(
      cycleAudit.data.some(
        (event) =>
          event.actionType === "REVIEW_CYCLE_ACTIVATED" &&
          event.entityType === "REVIEW_CYCLE"
      )
    );
  }
);
