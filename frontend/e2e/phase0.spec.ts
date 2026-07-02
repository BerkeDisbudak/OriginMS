import { expect, test } from "@playwright/test";

test("phase 0 shell renders without console errors", async ({ page }) => {
  const messages: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      messages.push(`${message.type()}: ${message.text()}`);
    }
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Pending leave" })).toBeVisible();
  expect(messages).toEqual([]);
});
