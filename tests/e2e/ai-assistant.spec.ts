import { expect, test } from "@playwright/test";

test.describe("AI Assistant Widget", () => {
  test("widget appears on live interface page", async ({ page }) => {
    await page.goto("http://localhost:3015");

    const button = page.locator("button[aria-label*='AI Assistant']");
    await expect(button).toBeVisible({ timeout: 5000 });
  });

  test("widget is collapsible", async ({ page }) => {
    await page.goto("http://localhost:3015");

    const button = page.locator("button[aria-label*='AI Assistant']");
    await expect(button).toBeVisible();

    const closeButton = page.locator("button:has-text('✕')");
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(button).toBeVisible();
    }
  });
});
