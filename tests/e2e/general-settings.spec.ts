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

test.describe("Pipe general settings", () => {
  test("editing identity, item name and permission toggles persists after reload", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `General Settings ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/settings/general-settings`);

    await expect(page.getByTestId("general-settings-heading")).toBeVisible();

    await page.getByTestId("pipe-item-name-input").fill("Tickets");
    await page.getByTestId("pipe-tag-input").fill("Urgent");
    await page.getByTestId("pipe-tag-input").press("Enter");
    await expect(page.getByTestId("pipe-tag-chip")).toContainText("Urgent");

    await page.getByTestId("default-view-list").click();
    await page.getByTestId("expiration-alert-time-input").fill("5");
    await page.getByTestId("expiration-alert-unit-select").selectOption("days");
    await page.getByTestId("expiration-business-days-checkbox").check();
    await page.getByTestId("restrict-delete-to-admin-checkbox").check();

    await page.getByTestId("save-general-settings").click();
    await expect(
      page.getByTestId("general-settings-saved-toast"),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("pipe-item-name-input")).toHaveValue(
      "Tickets",
    );
    await expect(page.getByTestId("pipe-tag-chip")).toContainText("Urgent");
    await expect(page.getByTestId("default-view-list")).toHaveClass(
      /border-blue-600/,
    );
    await expect(page.getByTestId("expiration-alert-time-input")).toHaveValue(
      "5",
    );
    await expect(
      page.getByTestId("expiration-business-days-checkbox"),
    ).toBeChecked();
    await expect(
      page.getByTestId("restrict-delete-to-admin-checkbox"),
    ).toBeChecked();
  });

  test("a custom item name changes the Kanban create-card button text", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Item Name Kanban ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/settings/general-settings`);

    await page.getByTestId("pipe-item-name-input").fill("Chamados");
    await page.getByTestId("save-general-settings").click();
    await expect(
      page.getByTestId("general-settings-saved-toast"),
    ).toBeVisible();

    await page.goto(`/pipes/${pipeId}`);
    await expect(page.getByTestId("create-card-button")).toContainText(
      "Chamados",
    );
  });

  test("deleting a pipe from the danger zone removes it from the home dashboard", async ({
    page,
  }) => {
    const name = `Delete Me ${Date.now()}`;
    const pipeId = await createPipe(page, name);
    await page.goto(`/pipes/${pipeId}/settings/general-settings`);

    await page.getByTestId("delete-pipe-button").click();
    await page.getByTestId("confirm-delete-pipe").click();

    await page.waitForURL("http://localhost:3015/");
    await expect(
      page.getByTestId("pipe-card").filter({ hasText: name }),
    ).toHaveCount(0);
  });
});
