import { expect, test } from "@playwright/test";

async function createPipe(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.getByTestId("create-pipe-tile").click();
  await page.getByTestId("create-from-scratch").click();
  await page.getByTestId("pipe-name-input").fill(name);
  await page.getByTestId("submit-create-pipe").click();
  await page.waitForURL(/\/pipes\/.+/);
  const match = page.url().match(/\/pipes\/([^/]+)/);
  if (!match) throw new Error("Could not extract pipe id from URL");
  return match[1];
}

test.describe("Pipe member management", () => {
  test("Pessoas page lists the self member and shows the manage-tabs entry", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Members Self ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/settings/members`);

    await expect(page.getByTestId("manage-tab-members")).toBeVisible();
    await expect(page.getByTestId("member-row")).toHaveCount(1);
    await expect(page.getByTestId("member-self-tag")).toBeVisible();
  });

  test("invite a member and change their role via the Função dropdown, persisted after reload", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Members Invite ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/settings/members`);

    await page.getByTestId("invite-members-button").click();
    await page.getByTestId("invite-name-input").fill("Maria Oliveira");
    await page
      .getByTestId("invite-email-input")
      .fill(`maria.${Date.now()}@example.com`);
    await page.getByTestId("invite-role-select").selectOption("pipe_member");
    await page.getByTestId("confirm-invite-button").click();

    await expect(page.getByTestId("member-row")).toHaveCount(2);
    const inviteeRow = page
      .getByTestId("member-row")
      .filter({ hasText: "Maria Oliveira" });
    await expect(inviteeRow).toBeVisible();

    await inviteeRow.getByTestId("member-role-trigger").click();
    await page.getByTestId("member-role-option-read_only").click();
    await expect(inviteeRow.getByTestId("member-role-trigger")).toContainText(
      /read only|somente leitura/i,
    );

    await page.reload();
    const reloadedRow = page
      .getByTestId("member-row")
      .filter({ hasText: "Maria Oliveira" });
    await expect(reloadedRow.getByTestId("member-role-trigger")).toContainText(
      /read only|somente leitura/i,
    );
  });

  test("removing a member drops them from the table", async ({ page }) => {
    const pipeId = await createPipe(page, `Members Remove ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/settings/members`);

    await page.getByTestId("invite-members-button").click();
    await page.getByTestId("invite-name-input").fill("Pedro Lima");
    await page
      .getByTestId("invite-email-input")
      .fill(`pedro.${Date.now()}@example.com`);
    await page.getByTestId("invite-role-select").selectOption("pipe_member");
    await page.getByTestId("confirm-invite-button").click();
    await expect(page.getByTestId("member-row")).toHaveCount(2);

    const targetRow = page
      .getByTestId("member-row")
      .filter({ hasText: "Pedro Lima" });
    await targetRow.getByTestId("member-remove-button").click();
    await page.getByTestId("confirm-remove-member").click();

    await expect(page.getByTestId("member-row")).toHaveCount(1);
  });
});
