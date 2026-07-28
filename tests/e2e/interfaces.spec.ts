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
  required = true,
) {
  const response = await page.request.post(
    `/api/pipes/${pipeId}/start-form/fields`,
    { data: { label, type: "short_text", required } },
  );
  if (!response.ok()) {
    throw new Error(`Failed to seed start form field: ${response.status()}`);
  }
  return (await response.json()).field as { id: string; label: string };
}

async function createCardViaApi(
  page: import("@playwright/test").Page,
  pipeId: string,
  values: Record<string, string>,
) {
  const pipeResponse = await page.request.get(`/api/pipes/${pipeId}`);
  const { phases } = await pipeResponse.json();
  const response = await page.request.post(`/api/pipes/${pipeId}/cards`, {
    data: { phaseId: phases[0].id, values },
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed card: ${response.status()}`);
  }
  return (await response.json()).card as { id: string; title: string };
}

async function createInterface(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/interfaces");
  await page.getByTestId("create-interface-cta").click();
  await page.getByTestId("interface-name-input").fill(name);
  await page.getByTestId("submit-create-interface").click();
  await page.waitForURL(/\/interfaces\/.+\/pages\/.+\/edit/);
  const match = page.url().match(/\/interfaces\/([^/]+)\/pages\/([^/]+)\/edit/);
  if (!match) throw new Error("Could not extract interface/page id from URL");
  return { interfaceId: match[1], pageId: match[2] };
}

test.describe("Interfaces builder", () => {
  test("empty interfaces list shows the empty state and CTA when there are none yet", async ({
    page,
  }) => {
    const response = await page.request.get("/api/interfaces");
    const { interfaces } = await response.json();
    test.skip(
      interfaces.length > 0,
      "org already has interfaces from a previous run",
    );

    await page.goto("/interfaces");
    await expect(page.getByTestId("interfaces-empty-state")).toBeVisible();
    await expect(page.getByTestId("create-interface-empty-cta")).toBeVisible();
  });

  test("create an interface, drag a Dados element onto the canvas, and see it reflect real pipe data", async ({
    page,
  }) => {
    const pipeName = `Interfaces Data Pipe ${Date.now()}`;
    const pipeId = await createPipe(page, pipeName);
    await addStartFormField(page, pipeId, "Nome");
    await createCardViaApi(page, pipeId, { nome: "Joao Silva" });

    await createInterface(page, `Test Portal ${Date.now()}`);

    const dataItem = page.locator(
      '[data-testid="palette-item"][data-element-type="data_table"]',
    );
    const canvas = page.getByTestId("builder-canvas");
    await dataItem.dragTo(canvas);

    await expect(page.getByTestId("data-table-config-panel")).toBeVisible();
    await page
      .getByTestId("data-source-select")
      .selectOption({ label: pipeName });

    const canvasTable = page.getByTestId("canvas-data-table");
    await expect(canvasTable).toContainText("Joao Silva");
    await expect(page.getByTestId("canvas-data-table-count")).toHaveText(/1/);
  });

  test("Formularios element opens the bound pipe's start form and creates a real card on submit", async ({
    page,
  }) => {
    const pipeName = `Interfaces Form Pipe ${Date.now()}`;
    const pipeId = await createPipe(page, pipeName);
    await addStartFormField(page, pipeId, "Solicitante");

    const beforeCards = await (
      await page.request.get(`/api/pipes/${pipeId}/cards`)
    ).json();
    expect(beforeCards.cards.length).toBe(0);

    const { pageId } = await createInterface(page, `Form Portal ${Date.now()}`);

    const formItem = page.locator(
      '[data-testid="palette-item"][data-element-type="form_link"]',
    );
    const canvas = page.getByTestId("builder-canvas");
    await formItem.dragTo(canvas);

    await expect(page.getByTestId("form-link-config-panel")).toBeVisible();
    await page
      .getByTestId("form-source-select")
      .selectOption({ label: pipeName });

    await page.getByTestId("view-live-link").click();
    await page.waitForURL(new RegExp(`/interfaces/.+/pages/${pageId}$`));

    await page.getByTestId("live-form-link").click();
    await expect(page.getByTestId("create-card-popover")).toBeVisible();
    await page.getByTestId("create-card-field-input").fill("Maria Souza");
    await page.getByTestId("submit-create-card").click();

    await expect(page.getByTestId("live-form-success")).toBeVisible();

    const afterCards = await (
      await page.request.get(`/api/pipes/${pipeId}/cards`)
    ).json();
    expect(afterCards.cards.length).toBe(1);
    expect(afterCards.cards[0].title).toBe("Maria Souza");
  });
});
