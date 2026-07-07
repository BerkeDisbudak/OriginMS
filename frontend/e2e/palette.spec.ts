import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("Ctrl+K opens the palette, Escape closes it without navigating", async ({ page }) => {
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();

  await page.keyboard.press("Control+k");
  const search = page.getByPlaceholder("Search");
  await expect(search).toBeVisible();
  await expect(search).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();
  await expect(page).toHaveURL(/\/employees$/);
});

test("arrow-key navigation and Enter select a Navigate item", async ({ page }) => {
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();

  await page.keyboard.press("Control+k");
  const search = page.getByPlaceholder("Search");
  await expect(search).toBeVisible();

  // Navigate items are Approval Inbox, Employees, Dashboard in that order
  // (global-palette.tsx); two ArrowDown presses from the default first
  // selection lands on Dashboard.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(search).toBeHidden();
});
