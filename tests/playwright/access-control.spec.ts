import { expect, test } from "@playwright/test";

import { expectWorkspaceUser, loginViaUi } from "./helpers";

test("неавторизованный пользователь перенаправляется на вход", async ({ page }) => {
  await page.goto("/participant");
  await expect(page).toHaveURL(/\/login\?next=\/participant$/);
  await expect(page.getByText("Вход в рабочие кабинеты")).toBeVisible();

  await page.goto("/secretariat");
  await expect(page).toHaveURL(/\/login\?next=\/secretariat$/);
  await expect(page.getByText("Вход в рабочие кабинеты")).toBeVisible();
});

test("участник видит ограничение доступа к кабинету секретариата", async ({ page }) => {
  const account = await loginViaUi(page, "participant");

  await expect(page).toHaveURL(/\/participant$/);
  await expect(page.getByRole("heading", { name: "На согласовании" })).toBeVisible();
  await expectWorkspaceUser(page, account.name);

  await page.goto("/secretariat");
  await expect(page.getByTestId("access-denied-card")).toBeVisible();
  await expect(page.getByText("Доступ ограничен")).toBeVisible();
  await expect(
    page.getByTestId("access-denied-card").getByRole("heading", { name: "Кабинет секретариата" })
  ).toBeVisible();
});
