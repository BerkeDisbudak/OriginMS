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
  await expect(panel).toBeVisible();

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
