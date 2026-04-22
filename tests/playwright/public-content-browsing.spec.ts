import { expect, test } from "@playwright/test";

test("публичные списки открывают детальные страницы контента", async ({ page }) => {
  await page.goto("/news");
  await expect(page.getByRole("heading", { name: "Новости" })).toBeVisible();
  await page
    .getByRole("link", {
      name: "На портале ТК 182 открыт новый публичный контур публикаций"
    })
    .click();
  await expect(page).toHaveURL(/\/news\/news-portal-content-launch$/);
  await expect(page.getByRole("heading", { name: "Текст публикации" })).toBeVisible();
  await expect(page.locator("body")).toContainText("новый публичный контур публикаций");

  await page.goto("/documents");
  await expect(
    page.getByRole("heading", { name: "Документы", exact: true, level: 1 })
  ).toBeVisible();
  await page.getByRole("link", { name: "Положение о ТК 182" }).click();
  await expect(page).toHaveURL(/\/documents\/public-document-main-regulation$/);
  await expect(page.getByRole("heading", { name: "Файл документа" })).toBeVisible();
  await expect(page.locator("body")).toContainText("Основные документы");
  await expect(page.getByRole("link", { name: "Скачать" })).toBeVisible();

  await page.goto("/meetings");
  await page.getByRole("link", { name: "Уведомление и повестка заседания ТК 182 от 24 апреля 2026 года" }).click();
  await expect(page).toHaveURL(/\/meetings\/meeting-agenda-q2-2026$/);
  await expect(page.getByRole("heading", { name: "Сведения о заседании" })).toBeVisible();
  await expect(page.locator("body")).toContainText("Место проведения");

  await page.goto("/standards");
  await page.getByRole("link", { name: "Неразрушающий контроль изделий, выполненных по аддитивным технологиям. Общие положения" }).click();
  await expect(page).toHaveURL(/\/standards\/approved-standard-ndt-2025$/);
  await expect(page.getByRole("heading", { name: "Сведения о стандарте" })).toBeVisible();
  await expect(page.locator("body")).toContainText("ПК 5");
});
