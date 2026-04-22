import { expect, test } from "@playwright/test";

import { expectWorkspaceUser, loginViaUi } from "./helpers";

test("секретариат может обновить статус замечания и загрузить файл", async ({
  page
}) => {
  const account = await loginViaUi(page, "secretariat");
  const marker = `PW-${Date.now()}`;
  const uploadFileName = `browser-${marker}.txt`;

  await expect(page).toHaveURL(/\/secretariat$/);
  await expect(page.getByRole("heading", { name: "Циклы согласования" })).toBeVisible();
  await expectWorkspaceUser(page, account.name);

  await page.getByTestId("secretariat-cycle-link-review-cycle-fire-sensors-apr").click();

  await expect(page).toHaveURL(/\/secretariat\/cycles\/review-cycle-fire-sensors-apr$/);
  await expect(page.getByText("Всего участников")).toBeVisible();

  const commentCard = page.getByTestId("secretariat-comment-card-comment-fire-sensors-ural-1");
  await commentCard
    .getByTestId("secretariat-comment-status-comment-fire-sensors-ural-1")
    .selectOption("NEEDS_CLARIFICATION");
  await commentCard
    .getByTestId("secretariat-comment-response-comment-fire-sensors-ural-1")
    .fill(`${marker}: необходимо уточнить формулировку замечания.`);
  await commentCard
    .getByTestId("secretariat-comment-submit-comment-fire-sensors-ural-1")
    .click();
  await page.waitForTimeout(1000);
  await page.reload();

  const savedCommentCard = page.getByTestId(
    "secretariat-comment-card-comment-fire-sensors-ural-1"
  );

  await expect(savedCommentCard).toContainText("Нужно уточнение");
  await expect(savedCommentCard).toContainText(marker);

  await page
    .getByTestId("secretariat-upload-file-input")
    .setInputFiles({
      name: uploadFileName,
      mimeType: "text/plain",
      buffer: Buffer.from(`Файл браузерного сценария ${marker}`, "utf8")
    });
  await page.getByTestId("secretariat-upload-visibility").selectOption("ASSIGNED_PARTICIPANTS");
  await page
    .getByTestId("secretariat-upload-description")
    .fill(`${marker}: файл, загруженный через Playwright.`);
  await page.getByTestId("secretariat-upload-submit").click();
  await page.waitForTimeout(1000);
  await page.reload();

  await expect(page.getByTestId("secretariat-version-files-upload-form")).toBeVisible();
  await expect(page.getByText(uploadFileName)).toBeVisible();
  await expect(page.getByText(`${marker}: файл, загруженный через Playwright.`)).toBeVisible();
});
