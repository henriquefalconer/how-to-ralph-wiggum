import { expect, test } from "@playwright/test";

async function createPipe(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.getByTestId("create-pipe-tile").click();
  await page.getByTestId("create-from-scratch").click();
  await page.getByTestId("pipe-name-input").fill(name);
  await page.getByTestId("submit-create-pipe").click();
  await page.waitForURL(/\/pipes\/.+/);
}

test.describe("Phase entity: Fases settings editor", () => {
  test("reorder phases via drag and drop on the Kanban board", async ({
    page,
  }) => {
    await createPipe(page, `Reorder Phases ${Date.now()}`);

    const headers = page.getByTestId("phase-column-header");
    await expect(headers).toHaveCount(3);
    const firstNameBefore = await headers.nth(0).textContent();
    const secondNameBefore = await headers.nth(1).textContent();

    await headers.nth(1).dragTo(headers.nth(0));

    await expect(headers.nth(0)).toHaveText(secondNameBefore ?? "");
    await expect(headers.nth(1)).toHaveText(firstNameBefore ?? "");

    await page.reload();
    const headersAfterReload = page.getByTestId("phase-column-header");
    await expect(headersAfterReload.nth(0)).toHaveText(secondNameBefore ?? "");
    await expect(headersAfterReload.nth(1)).toHaveText(firstNameBefore ?? "");
  });

  test("mark a phase as the final phase via Opções Avançadas", async ({
    page,
  }) => {
    await createPipe(page, `Final Phase ${Date.now()}`);

    await page.getByTestId("manage-pipe-link").click();
    await page.waitForURL(/\/settings\/phases\/.+/);

    const switcher = page.getByTestId("phase-switcher");
    const options = switcher.locator("option");
    const lastValue = await options
      .nth((await options.count()) - 1)
      .getAttribute("value");
    await switcher.selectOption(lastValue ?? "");

    await expect(page.getByTestId("phase-final-badge")).toBeVisible();

    await page.getByTestId("advanced-options-button").click();
    await expect(page.getByTestId("advanced-options-modal")).toBeVisible();
    await page.getByTestId("mark-final-checkbox").setChecked(true);
    await page.getByTestId("save-advanced-options").click();

    await expect(page.getByTestId("advanced-options-modal")).toBeHidden();
    await expect(page.getByTestId("phase-final-badge")).toBeVisible();
  });

  test("cannot delete the only remaining phase in a pipe", async ({ page }) => {
    await createPipe(page, `Delete Guard ${Date.now()}`);
    await page.getByTestId("manage-pipe-link").click();
    await page.waitForURL(/\/settings\/phases\/.+/);

    const switcher = page.getByTestId("phase-switcher");

    for (let i = 0; i < 2; i++) {
      await page.getByTestId("advanced-options-button").click();
      await page.getByTestId("delete-phase-button").click();
      await page.getByTestId("confirm-delete-phase").click();
      await page.waitForURL(/\/settings\/phases\/.+/);
    }

    await expect(switcher.locator("option")).toHaveCount(1);

    await page.getByTestId("advanced-options-button").click();
    await page.getByTestId("delete-phase-button").click();
    await page.getByTestId("confirm-delete-phase").click();

    await expect(
      page.getByText(/only remaining phase|única fase/i),
    ).toBeVisible();
    await expect(switcher.locator("option")).toHaveCount(1);
  });
});
