import { expect, test } from "@playwright/test";

import { expectWorkspaceUser, loginViaUi } from "./helpers";

test("участник может добавить замечание и отправить итоговую позицию", async ({
  page
}) => {
  const account = await loginViaUi(page, "participant");
  const marker = `PW-${Date.now()}`;

  await expect(page).toHaveURL(/\/participant$/);
  await expect(page.getByRole("heading", { name: "На согласовании" })).toBeVisible();
  await expectWorkspaceUser(page, account.name);
  await expect(page.getByTestId("participant-notifications-panel")).toContainText(
    "Уведомления"
  );
  await expect(page.getByTestId("participant-notifications-panel")).toContainText(
    "Назначен новый цикл согласования"
  );

  await page.locator('[data-testid^="participant-assignment-link-"]').first().click();

  await expect(page).toHaveURL(/\/participant\/reviews\//);
  await expect(page.getByRole("heading", { name: "Файлы версии" })).toBeVisible();

  const commentsForm = page.getByTestId("participant-create-comment-form");
  await commentsForm.getByLabel("Раздел").fill(`Раздел ${marker}`);
  await commentsForm.getByLabel("Пункт").fill("п. 7.2");
  await commentsForm.getByLabel("Страница").fill("18");
  await commentsForm
    .getByLabel("Замечание")
    .fill(`${marker}: требуется уточнить формулировку определения.`);
  await commentsForm
    .getByLabel("Предлагаемая редакция")
    .fill("Предлагаем дополнить определение ссылкой на терминологический раздел.");
  await commentsForm
    .getByLabel("Обоснование")
    .fill("Это устранит неоднозначность при применении проекта стандарта.");
  await commentsForm.getByTestId("participant-create-comment-submit").click();

  await expect(page.getByTestId("participant-comments-panel")).toContainText(marker);

  const positionPanel = page.getByTestId("participant-position-panel");
  const positionForm = page.getByTestId("participant-position-form");

  await positionForm.getByLabel("Согласовано с замечаниями").check();
  await positionForm
    .getByLabel("Комментарий к итоговой позиции")
    .fill(`${marker}: итоговая позиция направлена через браузерный сценарий.`);
  await positionForm.getByTestId("participant-position-submit").click();

  await expect(positionPanel).toContainText("Согласовано с замечаниями");
  await expect(positionPanel).toContainText(marker);
});
