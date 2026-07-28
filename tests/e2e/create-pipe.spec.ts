import { expect, test } from "@playwright/test";

test.describe("create a new pipe", () => {
  test("creates a pipe from the Início dashboard and lands on its Kanban board", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("create-pipe-tile").click();
    await expect(page.getByTestId("create-pipe-modal")).toBeVisible();

    await page.getByTestId("create-from-scratch").click();

    const pipeName = `Onboarding Clientes ${Date.now()}`;
    await page.getByTestId("pipe-name-input").fill(pipeName);
    await page.getByTestId("submit-create-pipe").click();

    await page.waitForURL(/\/pipes\/.+/);

    await expect(page.getByTestId("phase-column")).toHaveCount(3);
    const counts = page.getByTestId("phase-card-count");
    await expect(counts).toHaveCount(3);
    for (const countLocator of await counts.all()) {
      await expect(countLocator).toHaveText("0");
    }
    await expect(page.getByRole("heading", { name: pipeName })).toBeVisible();

    await page.goto("/");
    await expect(
      page.getByTestId("pipe-card").filter({ hasText: pipeName }),
    ).toBeVisible();
  });

  test("blocks submit when the name is only whitespace", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("create-pipe-tile").click();
    await page.getByTestId("create-from-scratch").click();

    await page.getByTestId("pipe-name-input").fill("   ");
    await expect(page.getByTestId("submit-create-pipe")).toBeDisabled();
  });

  test("allows two pipes to share the same name", async ({ page }) => {
    const name = `Duplicate Name ${Date.now()}`;

    for (let i = 0; i < 2; i++) {
      await page.goto("/");
      await page.getByTestId("create-pipe-tile").click();
      await page.getByTestId("create-from-scratch").click();
      await page.getByTestId("pipe-name-input").fill(name);
      await page.getByTestId("submit-create-pipe").click();
      await page.waitForURL(/\/pipes\/.+/);
    }

    await page.goto("/");
    await expect(
      page.getByTestId("pipe-card").filter({ hasText: name }),
    ).toHaveCount(2);
  });
});
