import { expect, test } from "@playwright/test";

import { expectWorkspaceUser, loginViaUi } from "./helpers";

test("секретариат может создать и опубликовать новость через браузер", async ({
  page
}) => {
  const account = await loginViaUi(page, "secretariat");
  const marker = `PW-CONTENT-${Date.now()}`;
  const newsTitle = `Новость Playwright ${marker}`;

  await expect(page).toHaveURL(/\/secretariat$/);
  await expectWorkspaceUser(page, account.name);

  await page.getByTestId("secretariat-content-link").click();
  await expect(page).toHaveURL(/\/secretariat\/content$/);
  await expect(page.getByRole("heading", { name: "Контент портала" })).toBeVisible();

  const newsForm = page.getByTestId("secretariat-news-form");
  await newsForm.getByTestId("secretariat-news-publication-date").fill("2026-04-22");
  await newsForm.getByTestId("secretariat-news-title").fill(newsTitle);
  await newsForm
    .getByTestId("secretariat-news-excerpt")
    .fill(`Краткое описание ${marker}`);
  await newsForm.getByTestId("secretariat-news-body").fill(`Полный текст ${marker}`);
  await newsForm.getByTestId("secretariat-news-submit").click();

  await expect(page.getByTestId("secretariat-news-panel")).toContainText(newsTitle);

  const newsCard = page
    .locator('[data-testid^="secretariat-news-card-"]')
    .filter({ hasText: newsTitle })
    .first();

  await newsCard.getByRole("button", { name: "Опубликовать" }).click();
  await page.waitForTimeout(1000);
  await page.goto("/news");

  await expect(page.getByRole("heading", { name: "Новости" })).toBeVisible();
  await expect(page.locator("body")).toContainText(newsTitle);
});
