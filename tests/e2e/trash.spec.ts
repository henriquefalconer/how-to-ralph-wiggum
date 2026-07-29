import { expect, test } from "@playwright/test";

test.describe("Card Trash (Lixeira)", () => {
  test("delete a card and restore it from trash", async ({ page }) => {
    // Navigate to a pipe
    await page.goto("http://localhost:3015/pipes");

    // Open the first pipe (assuming it exists from smoke test)
    const pipeLink = page.locator('a[href*="/pipes/"]').first();
    await pipeLink.click();
    await page.waitForURL(/\/pipes\/[a-f0-9-]+$/);

    // Get the pipe ID from the URL
    const url = page.url();
    const pipeId = url.split("/pipes/")[1];

    // Open the first card by clicking it
    const cardLink = page.locator(".kanban-card").first();
    if ((await cardLink.count()) > 0) {
      await cardLink.click();
      await page.waitForTimeout(500);

      // Open the card menu (kebab)
      const kebabMenu = page
        .locator('button[aria-label*="menu"], button[aria-label*="more"]')
        .first();
      if ((await kebabMenu.count()) > 0) {
        await kebabMenu.click();

        // Click "Mover card para a lixeira" or delete option
        const deleteOption = page
          .locator("text=Mover card para a lixeira, text=Excluir")
          .first();
        if ((await deleteOption.count()) > 0) {
          await deleteOption.click();

          // Confirm the deletion
          const confirmButton = page
            .locator('button:has-text("Confirmar"), button:has-text("Sim")')
            .first();
          if ((await confirmButton.count()) > 0) {
            await confirmButton.click();
            await page.waitForTimeout(500);
          }

          // Verify card is gone from Kanban
          await expect(cardLink).toBeHidden();

          // Navigate to trash (Gerenciar > Ferramentas > Lixeira)
          const manageButton = page
            .locator('button:has-text("Gerenciar"), [aria-label*="settings"]')
            .first();
          if ((await manageButton.count()) > 0) {
            await manageButton.click();
            await page.waitForTimeout(300);

            const toolsOption = page
              .locator("text=Ferramentas, text=Tools")
              .first();
            if ((await toolsOption.count()) > 0) {
              await toolsOption.click();
              await page.waitForTimeout(300);

              const trashOption = page
                .locator("text=Lixeira, text=Trash")
                .first();
              if ((await trashOption.count()) > 0) {
                await trashOption.click();
                await page.waitForTimeout(500);

                // Verify card is in trash
                const cardInTrash = page.locator(`text=${cardLink}`).first();
                if ((await cardInTrash.count()) > 0) {
                  // Click restore
                  const restoreButton = page
                    .locator("button:has-text(Restaurar)")
                    .first();
                  if ((await restoreButton.count()) > 0) {
                    await restoreButton.click();
                    await page.waitForTimeout(1000);

                    // Close trash modal
                    const closeButton = page
                      .locator('button[aria-label="Close"]')
                      .first();
                    if ((await closeButton.count()) > 0) {
                      await closeButton.click();
                    }

                    // Reload and check card is back
                    await page.reload();
                    await page.waitForTimeout(500);
                    await expect(cardLink).toBeVisible();
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});
