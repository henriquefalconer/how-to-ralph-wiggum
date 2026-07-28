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

async function getPhases(
  page: import("@playwright/test").Page,
  pipeId: string,
) {
  const response = await page.request.get(`/api/pipes/${pipeId}`);
  const body = await response.json();
  return body.phases as { id: string; name: string }[];
}

async function addPhaseField(
  page: import("@playwright/test").Page,
  phaseId: string,
  label: string,
  type: string,
  options?: string[],
) {
  const response = await page.request.post(`/api/phases/${phaseId}/fields`, {
    data: { label, type, options },
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed phase field: ${response.status()}`);
  }
  return (await response.json()).field as { id: string; label: string };
}

async function createCard(
  page: import("@playwright/test").Page,
  pipeId: string,
  phaseId: string,
  values: Record<string, string>,
) {
  const response = await page.request.post(`/api/pipes/${pipeId}/cards`, {
    data: { phaseId, values },
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed card: ${response.status()}`);
  }
  return (await response.json()).card as { id: string };
}

test.describe("Field conditionals", () => {
  test("create a conditional that hides a field, then see it fire live on a card", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Field Conditionals ${Date.now()}`);
    const startFormField = await addStartFormField(page, pipeId, "Título");
    const [inbox] = await getPhases(page, pipeId);

    const statusField = await addPhaseField(
      page,
      inbox.id,
      "Status",
      "select",
      ["Pendente", "Aprovado"],
    );
    const priorityField = await addPhaseField(
      page,
      inbox.id,
      "Prioridade",
      "short_text",
    );

    const card = await createCard(page, pipeId, inbox.id, {
      [startFormField.id]: "Sample Card",
    });

    // Build the conditional in the phase editor.
    await page.goto(`/pipes/${pipeId}/settings/phases/${inbox.id}`);
    await page.getByTestId("field-conditionals-button").click();
    await expect(page.getByTestId("field-conditionals-panel")).toBeVisible();
    await expect(page.getByTestId("field-conditionals-empty")).toBeVisible();

    await page.getByTestId("create-conditional-button").click();
    await expect(page.getByTestId("conditional-builder-modal")).toBeVisible();

    await page
      .getByTestId("conditional-name-input")
      .fill("Hide priority unless approved");

    await page
      .getByTestId("condition-field-select")
      .selectOption(statusField.id);
    await page.getByTestId("condition-operator-select").selectOption("equals");
    await page.getByTestId("condition-value-input").fill("Pendente");

    // Leave the true-branch action as its default ("Ocultar" / hide) and
    // target the Prioridade field.
    await page
      .getByTestId("true-action-target-select")
      .selectOption(priorityField.id);

    await page.getByTestId("save-conditional-button").click();
    await expect(page.getByTestId("conditional-builder-modal")).toBeHidden();

    const row = page
      .getByTestId("conditional-row")
      .filter({ hasText: "Hide priority unless approved" });
    await expect(row).toBeVisible();

    // On the card's field-fill form, setting Status to "Pendente" should
    // hide the Prioridade field live, with no reload.
    await page.goto(`/open-cards/${card.id}`);
    const statusRow = page
      .getByTestId("phase-field-row")
      .filter({ has: page.getByText("Status") });
    const priorityRow = page
      .getByTestId("phase-field-row")
      .filter({ has: page.getByText("Prioridade") });

    await expect(priorityRow).toBeVisible();
    await statusRow.getByTestId("phase-field-input").fill("Pendente");
    await expect(priorityRow).toBeHidden();

    await statusRow.getByTestId("phase-field-input").fill("Aprovado");
    await expect(priorityRow).toBeVisible();
  });
});
