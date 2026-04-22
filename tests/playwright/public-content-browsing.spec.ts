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

test("публичные страницы поддерживают поиск и фильтры", async ({ page }) => {
  await page.goto("/news");
  await page.locator('input[name="q"]').fill("контур");
  await page.locator('input[name="dateFrom"]').fill("2026-04-18");
  await page.locator('input[name="dateTo"]').fill("2026-04-18");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page).toHaveURL(/\/news\?q=%D0%BA%D0%BE%D0%BD%D1%82%D1%83%D1%80/);
  await expect(page.locator("body")).toContainText("Найдено новостей");
  await expect(
    page.getByRole("link", {
      name: "На портале ТК 182 открыт новый публичный контур публикаций"
    })
  ).toBeVisible();

  await page.goto("/documents");
  await page.locator('input[name="q"]').fill("Положение");
  await page.locator('select[name="category"]').selectOption("MAIN_DOCUMENTS");
  await page.locator('input[name="dateFrom"]').fill("2026-01-01");
  await page.locator('input[name="dateTo"]').fill("2026-01-31");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page).toHaveURL(/category=MAIN_DOCUMENTS/);
  await expect(page.locator("body")).toContainText("Найдено документов");
  await expect(page.locator("body")).toContainText("Положение о ТК 182");
  await expect(page.locator("body")).not.toContainText("Отчет о работе ТК 182 за 2025 год");
  await page.getByRole("link", { name: "Положение о ТК 182" }).click();
  await expect(page).toHaveURL(/\/documents\/public-document-main-regulation$/);
  await expect(page.getByRole("heading", { name: "Файл документа" })).toBeVisible();

  await page.goto("/meetings");
  await page.locator('input[name="q"]').fill("повестка");
  await page.locator('select[name="category"]').selectOption("MEETING_AGENDA");
  await page.locator('input[name="dateFrom"]').fill("2026-04-01");
  await page.locator('input[name="dateTo"]').fill("2026-04-30");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page).toHaveURL(/category=MEETING_AGENDA/);
  await expect(page.locator("body")).toContainText("Найдено записей");
  await expect(page.locator("body")).toContainText(
    "Уведомление и повестка заседания ТК 182"
  );
  await expect(page.locator("body")).not.toContainText("Протокол заседания ТК 182");
  await page
    .getByRole("link", {
      name: "Уведомление и повестка заседания ТК 182 от 24 апреля 2026 года"
    })
    .click();
  await expect(page).toHaveURL(/\/meetings\/meeting-agenda-q2-2026$/);
  await expect(page.getByRole("heading", { name: "Сведения о заседании" })).toBeVisible();

  await page.goto("/standards");
  await page.locator('input[name="q"]').fill("70518");
  await page.locator('select[name="section"]').selectOption("APPROVED_STANDARDS");
  await page
    .locator('select[name="responsibleSubcommitteeId"]')
    .selectOption("subcommittee-pk5");
  await page.locator('input[name="dateFrom"]').fill("2026-02-01");
  await page.locator('input[name="dateTo"]').fill("2026-02-28");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page).toHaveURL(/section=APPROVED_STANDARDS/);
  await expect(page.locator("body")).toContainText("Найдено:");
  await expect(page.locator("body")).toContainText("ГОСТ Р 70518-2025");
  await expect(page.locator("body")).not.toContainText("ГОСТ Р 70501-2025");
  await page
    .getByRole("link", {
      name: "Неразрушающий контроль изделий, выполненных по аддитивным технологиям. Общие положения"
    })
    .click();
  await expect(page).toHaveURL(/\/standards\/approved-standard-ndt-2025$/);
  await expect(page.getByRole("heading", { name: "Сведения о стандарте" })).toBeVisible();
  await expect(page.locator("body")).toContainText("ПК 5");
});
