import { expect, test } from "@playwright/test";

async function createPipe(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.getByTestId("create-pipe-tile").click();
  await page.getByTestId("create-from-scratch").click();
  await page.getByTestId("pipe-name-input").fill(name);
  await page.getByTestId("submit-create-pipe").click();
  await page.waitForURL(/\/pipes\/.+/);
}

test.describe("Field type system: phase field editor", () => {
  test("add a new select field to a phase via the field-type palette", async ({
    page,
  }) => {
    await createPipe(page, `Field System ${Date.now()}`);
    await page.getByTestId("manage-pipe-link").click();
    await page.waitForURL(/\/settings\/phases\/.+/);

    await expect(page.getByTestId("fields-empty")).toBeVisible();

    await page.getByTestId("field-type-select").click();
    await expect(page.getByTestId("field-editor-modal")).toBeVisible();

    await page.getByTestId("field-label-input").fill("Priority");
    await page.getByTestId("field-option-input").first().fill("Low");
    await page.getByTestId("add-option-button").click();
    await page.getByTestId("field-option-input").nth(1).fill("Medium");
    await page.getByTestId("add-option-button").click();
    await page.getByTestId("field-option-input").nth(2).fill("High");

    await page.getByTestId("save-field-button").click();

    await expect(page.getByTestId("field-editor-modal")).toBeHidden();
    const row = page.getByTestId("field-row").filter({ hasText: "Priority" });
    await expect(row).toBeVisible();

    await page.reload();
    await expect(
      page.getByTestId("field-row").filter({ hasText: "Priority" }),
    ).toBeVisible();
  });

  test("blocks creating a select field with no options", async ({ page }) => {
    await createPipe(page, `Field Options Guard ${Date.now()}`);
    await page.getByTestId("manage-pipe-link").click();
    await page.waitForURL(/\/settings\/phases\/.+/);

    await page.getByTestId("field-type-select").click();
    await page.getByTestId("field-label-input").fill("Status");
    await page.getByTestId("remove-option-button").click();
    await page.getByTestId("save-field-button").click();

    await expect(page.getByText(/options/i)).toBeVisible();
    await expect(page.getByTestId("field-editor-modal")).toBeVisible();
  });

  test("deletes a field from the phase's field list", async ({ page }) => {
    await createPipe(page, `Field Delete ${Date.now()}`);
    await page.getByTestId("manage-pipe-link").click();
    await page.waitForURL(/\/settings\/phases\/.+/);

    await page.getByTestId("field-type-short_text").click();
    await page.getByTestId("field-label-input").fill("Notes");
    await page.getByTestId("save-field-button").click();
    await expect(page.getByTestId("field-editor-modal")).toBeHidden();

    const row = page.getByTestId("field-row").filter({ hasText: "Notes" });
    await expect(row).toBeVisible();
    await row.getByTestId("delete-field-button").click();

    await expect(
      page.getByTestId("field-row").filter({ hasText: "Notes" }),
    ).toBeHidden();
    await expect(page.getByTestId("fields-empty")).toBeVisible();
  });
});
