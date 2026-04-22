import { expect, test } from "@playwright/test";

import { expectWorkspaceUser, loginViaUi } from "./helpers";

test("секретариат может управлять структурой ТК 182 через браузер", async ({
  page
}) => {
  const account = await loginViaUi(page, "secretariat");
  const marker = `PW-COM-${Date.now()}`;
  const organizationName = `Браузерная организация ${marker}`;
  const personName = `Браузерный Представитель ${marker}`;

  await expect(page).toHaveURL(/\/secretariat$/);
  await expect(page.getByRole("heading", { name: "Циклы согласования" })).toBeVisible();
  await expectWorkspaceUser(page, account.name);

  await page.getByTestId("secretariat-committee-link").click();
  await expect(page).toHaveURL(/\/secretariat\/committee$/);
  await expect(page.getByRole("heading", { name: "Структура ТК 182" })).toBeVisible();

  const organizationForm = page.getByTestId("secretariat-committee-organization-form");
  await organizationForm
    .getByTestId("secretariat-committee-organization-name")
    .fill(organizationName);
  await organizationForm
    .getByTestId("secretariat-committee-organization-short-name")
    .fill(`БР-${Date.now()}`);
  await organizationForm
    .getByTestId("secretariat-committee-organization-country-code")
    .fill("RU");
  await organizationForm
    .getByTestId("secretariat-committee-organization-submit")
    .click();

  await expect(page.getByTestId("secretariat-committee-organizations-panel")).toContainText(
    organizationName
  );

  const personForm = page.getByTestId("secretariat-committee-person-form");
  await personForm
    .getByTestId("secretariat-committee-person-full-name")
    .fill(personName);
  await personForm
    .getByTestId("secretariat-committee-person-job-title")
    .fill("Браузерный представитель для проверки public-структуры.");
  await personForm
    .getByTestId("secretariat-committee-person-organization")
    .selectOption({ label: organizationName });
  await personForm.getByTestId("secretariat-committee-person-submit").click();

  await expect(page.getByTestId("secretariat-committee-people-panel")).toContainText(
    personName
  );

  const roleForm = page.getByTestId("secretariat-committee-role-form");
  await roleForm
    .getByTestId("secretariat-committee-role-person")
    .selectOption({ label: personName });
  await roleForm
    .getByTestId("secretariat-committee-role-role")
    .selectOption("committee-role-deputy-co-chair");
  await roleForm
    .getByTestId("secretariat-committee-role-sort-order")
    .fill("95");
  await roleForm.getByTestId("secretariat-committee-role-submit").click();

  await expect(page.getByTestId("secretariat-committee-role-panel")).toContainText(
    personName
  );
  await expect(page.getByTestId("secretariat-audit-panel")).toContainText(
    "Журнал изменений структуры"
  );

  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: "Руководство ТК 182" })
  ).toBeVisible();
  await expect(page.locator("body")).toContainText(personName);
});
