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

test.describe("Dashboards (Painéis)", () => {
  test("empty dashboards list shows the 'Nenhum painel criado' CTA", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Dashboards Empty ${Date.now()}`);
    await page.goto(`/pipes/${pipeId}/dashboards`);

    await expect(page.getByTestId("dashboards-empty-state")).toBeVisible();
    await expect(page.getByTestId("create-dashboard-cta")).toBeVisible();
  });

  test("create a dashboard and add a KPI number chart showing the current card count", async ({
    page,
  }) => {
    const pipeId = await createPipe(page, `Dashboards KPI ${Date.now()}`);
    await page.request.post(`/api/pipes/${pipeId}/start-form/fields`, {
      data: { label: "Title", type: "short_text", required: true },
    });

    // Seed one card so the number chart has a non-zero, checkable value.
    await page.goto(`/pipes/${pipeId}`);
    await page.getByTestId("create-card-button").click();
    await page.getByTestId("create-card-field-input").fill("Only Card");
    await page.getByTestId("submit-create-card").click();
    await expect(page.getByTestId("create-card-popover")).toBeHidden();

    await page.goto(`/pipes/${pipeId}/dashboards`);
    await page.getByTestId("create-dashboard-cta").click();
    await page.getByTestId("dashboard-name-input").fill("Visão Geral");
    await page.getByTestId("submit-create-dashboard").click();

    await page.waitForURL(/\/dashboards\/[^/]+$/);
    await page.getByTestId("add-chart-button").click();
    await page.waitForURL(/\/dashboards\/chart\?dashboardId=.+/);

    await page.getByTestId("metric-picker-trigger").click();
    await page.getByTestId("metric-option-cards_total").click();
    await page.getByTestId("viz-type-number").click();

    await expect(page.getByTestId("chart-number-value")).toHaveText("1");

    await page.getByTestId("save-chart-button").click();
    await page.getByTestId("confirm-save-chart-button").click();

    await page.waitForURL(/\/dashboards\/[^/]+$/);
    await expect(page.getByTestId("chart-tile")).toBeVisible();
    await expect(page.getByTestId("chart-number-value")).toHaveText("1");
  });
});
