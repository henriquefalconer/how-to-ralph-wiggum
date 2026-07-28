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

async function addStartFormField(
  page: import("@playwright/test").Page,
  pipeId: string,
  label: string,
) {
  const response = await page.request.post(
    `/api/pipes/${pipeId}/start-form/fields`,
    { data: { label, type: "short_text" } },
  );
  if (!response.ok()) {
    throw new Error(`Failed to seed start form field: ${response.status()}`);
  }
  return (await response.json()).field as { id: string; label: string };
}

test.describe("Report builder", () => {
  test("empty reports list shows the 'Criar novo relatório' CTA", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Reports Empty ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/reports_v2`);

    await expect(page.getByTestId("reports-empty-state")).toBeVisible();
    await expect(page.getByTestId("new-report-tile")).toBeVisible();
  });

  test("create and save a filtered report, then see it as a tile with a result count", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Reports Filter ${Date.now()}`);
    const titleField = await addStartFormField(page, pipeId, "Title");

    // Seed one matching and one non-matching card via the real create-card flow.
    await page.goto(`/pipes/${pipeId}`);
    await page.getByTestId("create-card-button").click();
    await page.getByTestId("create-card-field-input").fill("Widget Order");
    await page.getByTestId("submit-create-card").click();
    await expect(page.getByTestId("create-card-popover")).toBeHidden();

    await page.getByTestId("create-card-button").click();
    await page.getByTestId("create-card-field-input").fill("Gadget Order");
    await page.getByTestId("submit-create-card").click();
    await expect(page.getByTestId("create-card-popover")).toBeHidden();

    await page.goto(`/pipes/${pipeId}/reports_v2/new`);
    await page.getByTestId("add-filter-button").click();
    await page.getByTestId(`field-option-${titleField.id}`).click();
    await page.getByTestId("operator-contains").check();
    await page.getByTestId("filter-value-input").fill("Widget");
    await page.getByTestId("apply-filter-button").click();

    await expect(page.getByTestId("report-result-row")).toHaveCount(1);
    await expect(page.getByTestId("report-result-row")).toContainText(
      "Widget Order",
    );

    await page.getByTestId("save-report-button").click();
    await page.getByTestId("report-name-input").fill("Widgets only");
    await page.getByTestId("confirm-save-report-button").click();

    await page.waitForURL(/\/reports_v2\/[^/]+$/);
    await page.goto(`/pipes/${pipeId}/reports_v2`);
    const tile = page
      .getByTestId("report-tile")
      .filter({ hasText: "Widgets only" });
    await expect(tile).toBeVisible();
    await expect(tile.getByTestId("report-result-count")).toContainText("1");
  });
});
