import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads with top nav and the create-pipe entry point", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("pipefy")).toBeVisible();
    await expect(page.getByTestId("create-pipe-tile")).toBeVisible();
  });

  test("navigating into a pipe loads its Kanban board", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("create-pipe-tile").click();
    await page.getByTestId("create-from-scratch").click();
    await page.getByTestId("pipe-name-input").fill(`Smoke Test ${Date.now()}`);
    await page.getByTestId("submit-create-pipe").click();

    await page.waitForURL(/\/pipes\/.+/);
    await expect(page.getByTestId("kanban-board")).toBeVisible();
    await expect(page.getByTestId("phase-column")).toHaveCount(3);
  });

  test("the Kanban board's back link returns to the home dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-pipe-tile").click();
    await page.getByTestId("create-from-scratch").click();
    await page.getByTestId("pipe-name-input").fill(`Smoke Nav ${Date.now()}`);
    await page.getByTestId("submit-create-pipe").click();
    await page.waitForURL(/\/pipes\/.+/);

    await page.getByRole("link", { name: /back to home/i }).click();
    await page.waitForURL("http://localhost:3015/");
    await expect(page.getByTestId("create-pipe-tile")).toBeVisible();
  });
});
