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

test.describe("Pipe audit log (Atividades)", () => {
  test("filters the log by author", async ({ page }) => {
    const pipeId = await createPipe(page, `Audit Log ${Date.now()}`);

    // Gerenciar > Atividades
    await page.goto(`/pipes/${pipeId}/settings/phases`);
    await page.getByTestId("manage-tab-activities").click();
    await page.waitForURL(/\/settings\/activities/);
    await expect(page.getByTestId("audit-log-modal")).toBeVisible();

    // A brand new pipe always has its "created this pipe" entry.
    await page.getByTestId("audit-tab-config_change").click();
    const rows = page.getByTestId("audit-log-row");
    await expect(rows).toHaveCount(1);

    const author = await page
      .getByTestId("audit-log-actor")
      .first()
      .innerText();

    await page.getByTestId("audit-log-search").fill(author.slice(0, 3));
    await expect(page.getByTestId("audit-log-row")).toHaveCount(1);
    await expect(page.getByTestId("audit-log-actor").first()).toHaveText(
      author,
    );

    await page.getByTestId("audit-log-search").fill("someone-who-did-nothing");
    await expect(page.getByTestId("audit-log-row")).toHaveCount(0);
    await expect(page.getByTestId("audit-log-empty")).toBeVisible();
  });

  test("card activity and configuration changes land in their own tabs", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Audit Tabs ${Date.now()}`);

    // A start-form field (config change) plus a card (card activity).
    const seeded = await page.request.post(
      `/api/pipes/${pipeId}/start-form/fields`,
      { data: { label: "Requester name", type: "short_text", required: true } },
    );
    expect(seeded.ok()).toBe(true);

    await page.reload();
    await page.getByTestId("create-card-button").click();
    await page.getByTestId("create-card-field-input").fill("Ana Costa");
    await page.getByTestId("submit-create-card").click();
    await expect(
      page.getByTestId("card-tile").filter({ hasText: "Ana Costa" }),
    ).toBeVisible();

    await page.goto(`/pipes/${pipeId}/settings/activities`);

    await page.getByTestId("audit-tab-card_activity").click();
    await expect(page.getByTestId("audit-log-details").first()).toContainText(
      "Ana Costa",
    );

    await page.getByTestId("audit-tab-config_change").click();
    const configDetails = page.getByTestId("audit-log-details");
    await expect(
      configDetails.filter({ hasText: "Requester name" }),
    ).toHaveCount(1);
    await expect(configDetails.filter({ hasText: "Ana Costa" })).toHaveCount(0);
  });

  test("exports the log as CSV", async ({ page }) => {
    const pipeId = await createPipe(page, `Audit Export ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/settings/activities`);

    const response = await page.request.get(
      `/api/pipes/${pipeId}/audit-log?format=csv&category=config_change&locale=en`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");

    const csv = await response.text();
    expect(csv.split("\n")[0]).toContain("Details");
    expect(csv).toContain("Created this pipe");
  });
});
