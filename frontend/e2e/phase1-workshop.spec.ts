import { expect, test } from "@playwright/test";

test("phase 1 shell stays product-neutral and warning-free", async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push(message.text());
    }
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Pending leave" })).toBeVisible();
  expect(consoleMessages).toEqual([]);
});
