import { expect, type Page } from "@playwright/test";

type AccountKey = "participant" | "secretariat";

const accounts: Record<AccountKey, { email: string; name: string; password: string }> = {
  participant: {
    email: "participant@tk182.local",
    name: "Иван Петров",
    password: "ParticipantPass123!"
  },
  secretariat: {
    email: "secretariat@tk182.local",
    name: "Елена Соколова",
    password: "SecretariatPass123!"
  }
};

export async function loginViaUi(page: Page, accountKey: AccountKey) {
  const account = accounts[accountKey];

  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible();
  await page.getByTestId("login-email").fill(account.email);
  await page.getByTestId("login-password").fill(account.password);
  await page.getByTestId("login-submit").click();

  return account;
}

export async function expectWorkspaceUser(page: Page, name: string) {
  await expect(page.getByTestId("workspace-session-card")).toContainText(name);
}
