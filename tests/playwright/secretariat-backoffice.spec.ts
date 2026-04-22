import { expect, test } from "@playwright/test";

import { expectWorkspaceUser, loginViaUi } from "./helpers";

test("секретариат может создать новый цикл и открыть его для участника", async ({
  page
}) => {
  const account = await loginViaUi(page, "secretariat");
  const marker = `PW-${Date.now()}`;
  const draftCode = `ТК182-BR-${Date.now()}`;
  const draftTitle = `Браузерный проект стандарта ${marker}`;
  const cycleTitle = `Браузерный цикл ${marker}`;

  await expect(page).toHaveURL(/\/secretariat$/);
  await expect(page.getByRole("heading", { name: "Циклы согласования" })).toBeVisible();
  await expectWorkspaceUser(page, account.name);

  await page.getByTestId("secretariat-projects-link").click();
  await expect(page).toHaveURL(/\/secretariat\/projects$/);
  await expect(page.getByRole("heading", { name: "Проекты стандартов" })).toBeVisible();

  const createDraftForm = page.getByTestId("secretariat-create-draft-standard-form");
  await createDraftForm.getByTestId("secretariat-draft-standard-code").fill(draftCode);
  await createDraftForm.getByTestId("secretariat-draft-standard-title").fill(draftTitle);
  await createDraftForm
    .getByTestId("secretariat-draft-standard-summary")
    .fill("Браузерный сценарий создаёт новый проект стандарта для проверки backoffice.");
  await createDraftForm.getByTestId("secretariat-draft-standard-stage").fill("Подготовка");
  await createDraftForm
    .getByTestId("secretariat-draft-standard-subcommittee")
    .selectOption("subcommittee-pk7");
  await createDraftForm.getByTestId("secretariat-draft-standard-submit").click();

  await expect(page).toHaveURL(/\/secretariat\/projects\//);
  await expect(page.getByRole("heading", { name: draftTitle })).toBeVisible();
  await expect(page.locator("body")).toContainText("ПК 7");

  const versionForm = page.getByTestId("secretariat-create-version-form");
  await versionForm.getByTestId("secretariat-version-label").fill("Редакция 0.1");
  await versionForm
    .getByTestId("secretariat-version-revision-summary")
    .fill("Первая редакция, созданная из браузерного сценария.");
  await versionForm
    .getByTestId("secretariat-version-file-name")
    .fill(`browser-${marker}.docx`);
  await versionForm
    .getByTestId("secretariat-version-file-note")
    .fill("Основной файл новой версии для согласования.");
  await versionForm.getByTestId("secretariat-version-submit").click();

  await expect(
    page.locator('[data-testid^="secretariat-project-version-"]').first()
  ).toContainText("Редакция 0.1");

  const cycleForm = page.getByTestId("secretariat-create-cycle-form");
  await cycleForm.getByTestId("secretariat-cycle-title").fill(cycleTitle);
  await cycleForm
    .getByTestId("secretariat-cycle-description")
    .fill("Браузерный цикл согласования для проверки назначения участника.");
  await cycleForm.getByTestId("secretariat-cycle-submit").click();

  await expect(page).toHaveURL(/\/secretariat\/cycles\//);
  await expect(page.getByTestId("secretariat-cycle-management-form")).toBeVisible();

  const assignmentForm = page.getByTestId("secretariat-assignment-create-form");
  await assignmentForm.getByTestId("secretariat-assignment-user").selectOption(
    "user-participant"
  );
  await assignmentForm.getByTestId("secretariat-assignment-submit").click();

  await expect(page.getByTestId("secretariat-assignment-panel")).toContainText(
    "Иван Петров"
  );

  await page.getByTestId("secretariat-cycle-management-activate").click();
  await expect(page.getByTestId("secretariat-cycle-management-form")).toContainText(
    "Статус: Открыт"
  );

  await page.getByTestId("logout-button").click();
  await expect(page).toHaveURL(/\/login$/);

  const participantAccount = await loginViaUi(page, "participant");
  await expect(page).toHaveURL(/\/participant$/);
  await expectWorkspaceUser(page, participantAccount.name);

  const participantCard = page.locator("article.review-card").filter({
    hasText: draftTitle
  });

  await expect(participantCard).toContainText(cycleTitle);
  await participantCard.getByRole("link", { name: "Открыть карточку проекта" }).click();

  await expect(page).toHaveURL(/\/participant\/reviews\//);
  await expect(page.getByRole("heading", { name: draftTitle })).toBeVisible();
  await expect(page.locator("body")).toContainText("Редакция 0.1");
});
