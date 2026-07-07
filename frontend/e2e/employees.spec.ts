import { expect, type Page, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function openDirectory(page: Page, demoUser?: string) {
  const url = demoUser ? `/employees?demoUser=${demoUser}` : "/employees";
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
}

test("employees happy path: open, switch tabs, close", async ({ page }) => {
  await openDirectory(page);

  const firstRow = page.locator("tbody tr").first();
  await firstRow.click();

  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();

  await page.getByRole("tab", { name: "Employment" }).click();
  await expect(page.getByText("Employment details are coming soon.")).toBeVisible();

  await page.getByRole("tab", { name: "Time" }).click();
  await expect(page.getByText("Time details are coming soon.")).toBeVisible();

  await page.getByRole("tab", { name: "Documents" }).click();
  await expect(page.getByText("Documents details are coming soon.")).toBeVisible();

  await page.getByLabel("Close panel").first().click();
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(/(?!.*panel=)/);
});

test("employees keyboard-only path", async ({ page }) => {
  await openDirectory(page);

  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await page.keyboard.press("k");
  await page.keyboard.press("Enter");

  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("employees panel is URL-addressable", async ({ page }) => {
  await openDirectory(page);

  const firstRow = page.locator("tbody tr").first();
  await firstRow.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/panel=emp_/);

  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("hr_admin sees the Edit affordance", async ({ page }) => {
  await openDirectory(page, "hr");

  await page.locator("tbody tr").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});

test("manager does not see the Edit affordance", async ({ page }) => {
  await openDirectory(page, "manager");

  await page.locator("tbody tr").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "More actions" })).toBeVisible();
});

test("row-to-panel morph completes cleanly without layout thrash", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await openDirectory(page);

  await page.locator("tbody tr").first().click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();

  // Morph settles, then body content fades in (MOTION_SPEC §5's sequence).
  await expect(panel.getByText("Leave balance")).toBeVisible();
  await expect(panel.locator("h2")).not.toHaveText("Employee");

  expect(consoleErrors).toEqual([]);
});

test("keyboard interrupt-spam retargets cleanly with no console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await openDirectory(page);

  await page.keyboard.press("Enter");
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Enter");

  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Leave balance")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("keyboard Tab after opening lands inside the panel and stays trapped", async ({ page }) => {
  await openDirectory(page);
  await page.keyboard.press("Enter");

  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible({ timeout: 10_000 });
  await expect(panel.getByText("Leave balance")).toBeVisible();

  await page.keyboard.press("Tab");
  const focusedInsidePanel = await page.evaluate(
    () => !!document.activeElement?.closest('[role="dialog"]'),
  );
  expect(focusedInsidePanel).toBe(true);

  // Tab all the way through the panel's focusable elements -- it must wrap
  // back inside the panel rather than escaping to the directory rows behind it.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
  }
  const stillTrappedForward = await page.evaluate(
    () => !!document.activeElement?.closest('[role="dialog"]'),
  );
  expect(stillTrappedForward).toBe(true);

  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Shift+Tab");
  }
  const stillTrappedBackward = await page.evaluate(
    () => !!document.activeElement?.closest('[role="dialog"]'),
  );
  expect(stillTrappedBackward).toBe(true);
});

test("closing the panel returns focus to the triggering row", async ({ page }) => {
  await openDirectory(page);

  const firstRow = page.locator("tbody tr").first();
  await firstRow.click();

  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible({ timeout: 10_000 });
  await expect(panel.getByText("Leave balance")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(firstRow).toBeFocused();
});
