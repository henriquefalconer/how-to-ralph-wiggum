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
) {
  const response = await page.request.post(`/api/phases/${phaseId}/fields`, {
    data: { label, type: "short_text" },
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed phase field: ${response.status()}`);
  }
  return (await response.json()).field as { id: string; label: string };
}

test.describe("Automations engine", () => {
  test("empty automations list shows the 'Nova automação' CTA", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Automations Empty ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/automations`);

    await expect(page.getByTestId("automations-empty-state")).toBeVisible();
    await expect(page.getByTestId("new-automation-link")).toBeVisible();
  });

  test("create a phase-enter -> update-field automation, fire it, and see the log + written value", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Automations Fire ${Date.now()}`);
    const startFormField = await addStartFormField(
      page,
      pipeId,
      "Nome do solicitante",
    );
    const phases = await getPhases(page, pipeId);
    const [inbox, doing] = phases;
    const inboxField = await addPhaseField(
      page,
      inbox.id,
      "Nome do solicitante",
    );

    // Create a card in Inbox with the start-form field filled in.
    await page.goto(`/pipes/${pipeId}`);
    await page.getByTestId("create-card-button").click();
    await page.getByTestId("create-card-field-input").fill("João Silva");
    await page.getByTestId("submit-create-card").click();
    await expect(page.getByTestId("create-card-popover")).toBeHidden();

    // Build the automation: card enters Doing -> update Inbox's own field via a token.
    await page.goto(`/pipes/${pipeId}/automations/new`);
    await page.getByTestId("trigger-card_entered_phase").click();
    await page
      .getByTestId("trigger-phase-select")
      .selectOption({ label: doing.name });

    await page.getByTestId("action-update_field").click();
    await page.getByLabel("A phase in this pipe").check();
    await page
      .getByTestId("action-phase-select")
      .selectOption({ label: inbox.name });
    await page
      .getByTestId("action-field-select")
      .selectOption({ label: inboxField.label });

    await page.getByTestId("insert-token-button").click();
    await page
      .getByTestId("token-picker")
      .getByTestId(`token-start_form-${startFormField.id}`)
      .click();
    await expect(page.getByTestId("action-value-input")).toHaveValue(
      `{{start_form.${startFormField.id}}}`,
    );

    await page.getByTestId("open-name-modal-button").click();
    await page.getByTestId("automation-name-input").fill("Copy requester name");
    await page.getByTestId("save-automation-button").click();

    await page.waitForURL(/\/automations$/);
    await expect(
      page
        .getByTestId("automation-row")
        .filter({ hasText: "Copy requester name" }),
    ).toBeVisible();

    // Fire the trigger by moving the card into "Doing".
    await page.goto(`/pipes/${pipeId}`);
    const columns = page.getByTestId("phase-column");
    const cardTile = page
      .getByTestId("card-tile")
      .filter({ hasText: "João Silva" });
    await cardTile.dragTo(columns.nth(1));
    await expect(page.getByTestId("card-toast")).toBeVisible();

    // Logs show a successful run.
    await page.goto(`/pipes/${pipeId}/automations/logs`);
    const logRow = page.getByTestId("automation-log-row");
    await expect(logRow).toBeVisible();
    await expect(logRow.getByTestId("automation-log-status")).toHaveText(
      /success/i,
    );
  });
});
