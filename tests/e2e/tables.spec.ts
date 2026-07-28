import { expect, test } from "@playwright/test";

async function createDatabase(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/");
  await page.getByTestId("home-tab-databases").click();
  await page.getByTestId("create-database-tile").click();
  await page.getByTestId("database-name-input").fill(name);
  await page.getByTestId("submit-create-database").click();
  await page.waitForURL(/\/apollo_databases\/.+/);
  const match = page.url().match(/\/apollo_databases\/([^/]+)/);
  if (!match) throw new Error("Could not extract table id from URL");
  return match[1];
}

async function addTableField(
  page: import("@playwright/test").Page,
  tableId: string,
  label: string,
  required = false,
) {
  const response = await page.request.post(`/api/tables/${tableId}/fields`, {
    data: { label, type: "short_text", required },
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed table field: ${response.status()}`);
  }
  const { field } = await response.json();
  return field.id as string;
}

test.describe("Database Table entity: create and edit records", () => {
  test("create a new record in a database table", async ({ page }) => {
    const tableId = await createDatabase(page, `Suppliers ${Date.now()}`);
    await addTableField(page, tableId, "Name", true);
    await page.reload();

    await expect(page.getByTestId("database-empty-state")).toBeVisible();

    await page.getByTestId("create-record-button").click();
    await expect(page.getByTestId("create-record-modal")).toBeVisible();
    await page.getByTestId("create-record-field-input").fill("Acme Corp");
    await page.getByTestId("submit-create-record").click();

    await expect(page.getByTestId("create-record-modal")).toBeHidden();
    const row = page.getByTestId("database-record-row");
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId("record-title-link")).toHaveText("Acme Corp");
    await expect(page.getByTestId("records-count")).toHaveText(/1/);
  });

  test("edit a record field inline from the record detail view, and the header stays in sync", async ({
    page,
  }) => {
    const tableId = await createDatabase(page, `Status Table ${Date.now()}`);
    const statusFieldId = await addTableField(page, tableId, "Status");
    await page.request.patch(`/api/tables/${tableId}`, {
      data: { titleFieldId: statusFieldId },
    });

    await page.goto(`/apollo_databases/${tableId}`);
    await page.getByTestId("create-record-button").click();
    await page.getByTestId("create-record-field-input").fill("Ativo");
    await page.getByTestId("submit-create-record").click();
    await expect(page.getByTestId("create-record-modal")).toBeHidden();

    await page.getByTestId("record-title-link").click();
    await page.waitForURL(/\/apollo_databases\/.+\/records\/.+/);

    await expect(page.getByTestId("record-title")).toHaveText("Ativo");
    await expect(page.getByTestId("record-title-badge")).toHaveText("Ativo");

    await page
      .getByTestId("record-field-row")
      .filter({ hasText: "Status" })
      .getByTestId("edit-field-button")
      .click();
    await page.getByTestId("edit-field-input").fill("Inativo");
    await page.getByTestId("save-field-edit").click();

    await expect(page.getByTestId("record-field-value")).toHaveText("Inativo");
    // The clone must NOT reproduce the target's confirmed badge-desync bug.
    await expect(page.getByTestId("record-title")).toHaveText("Inativo");
    await expect(page.getByTestId("record-title-badge")).toHaveText("Inativo");

    await page.reload();
    await expect(page.getByTestId("record-title-badge")).toHaveText("Inativo");
  });
});
