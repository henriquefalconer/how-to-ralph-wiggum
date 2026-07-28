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

async function addRequiredStartFormField(
  page: import("@playwright/test").Page,
  pipeId: string,
  label: string,
) {
  const response = await page.request.post(
    `/api/pipes/${pipeId}/start-form/fields`,
    { data: { label, type: "short_text", required: true } },
  );
  if (!response.ok()) {
    throw new Error(`Failed to seed start form field: ${response.status()}`);
  }
}

test.describe("Card entity: create and move", () => {
  test("create a card via the Kanban 'Criar novo card' popover and open its detail view", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Card Create ${Date.now()}`);
    await addRequiredStartFormField(page, pipeId, "Nome do solicitante");
    await page.reload();

    // No start form field filled in yet blocks nothing here — the popover itself gates on submit.
    await page.getByTestId("create-card-button").click();
    await expect(page.getByTestId("create-card-popover")).toBeVisible();

    await page.getByTestId("submit-create-card").click();
    await expect(page.getByTestId("create-card-field-error")).toBeVisible();
    await expect(page.getByTestId("create-card-field-error")).toHaveText(
      /informado|required|obligatorio|filled/i,
    );

    await page.getByTestId("create-card-field-input").fill("Test Card");
    await page.getByTestId("submit-create-card").click();

    await expect(page.getByTestId("create-card-popover")).toBeHidden();
    const cardTile = page
      .getByTestId("card-tile")
      .filter({ hasText: "Test Card" });
    await expect(cardTile).toBeVisible();
    await expect(page.getByTestId("card-toast")).toBeVisible();

    await cardTile.click();
    await page.waitForURL(/\/open-cards\/.+/);
    await expect(page.getByTestId("card-title")).toHaveText("Test Card");
    await expect(page.getByTestId("start-form-value").first()).toHaveText(
      "Test Card",
    );
  });

  test("blocks card creation with no start form fields via the share-form promo", async ({
    page,
  }) => {
    await createPipe(page, `No Start Form ${Date.now()}`);

    await page.getByTestId("create-card-button").click();
    await expect(page.getByTestId("share-form-modal")).toBeVisible();
    await expect(page.getByTestId("create-card-popover")).toBeHidden();
  });

  test("drag a card from one phase column to the next", async ({ page }) => {
    const pipeId = await createPipe(page, `Card Move ${Date.now()}`);
    await addRequiredStartFormField(page, pipeId, "Nome");
    await page.reload();

    await page.getByTestId("create-card-button").click();
    await page.getByTestId("create-card-field-input").fill("Move Me");
    await page.getByTestId("submit-create-card").click();
    await expect(page.getByTestId("create-card-popover")).toBeHidden();

    const columns = page.getByTestId("phase-column");
    const firstColumnCount = columns.nth(0).getByTestId("phase-card-count");
    const secondColumnCount = columns.nth(1).getByTestId("phase-card-count");
    await expect(firstColumnCount).toHaveText("1");
    await expect(secondColumnCount).toHaveText("0");

    const cardTile = page
      .getByTestId("card-tile")
      .filter({ hasText: "Move Me" });
    await cardTile.dragTo(columns.nth(1));

    await expect(secondColumnCount).toHaveText("1");
    await expect(firstColumnCount).toHaveText("0");
    await expect(
      columns.nth(1).getByTestId("card-tile").filter({ hasText: "Move Me" }),
    ).toBeVisible();
    await expect(page.getByTestId("card-toast")).toBeVisible();

    await page.reload();
    await expect(
      columns.nth(1).getByTestId("card-tile").filter({ hasText: "Move Me" }),
    ).toBeVisible();

    await columns
      .nth(1)
      .getByTestId("card-tile")
      .filter({ hasText: "Move Me" })
      .click();
    await page.waitForURL(/\/open-cards\/.+/);
    await expect(page.getByTestId("history-list")).toBeVisible();
    await expect(page.getByTestId("history-empty")).toBeHidden();
  });
});
