import { expect, type Page, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ request }, testInfo) => {
  const login = await request.post("http://127.0.0.1:8000/api/v1/auth/login", {
    data: {
      email: "employee@origin-fgl.local",
      password: "password",
    },
  });
  expect(login.ok()).toBe(true);
  const { access_token: accessToken } = (await login.json()) as { access_token: string };
  let lastCreateBody = "";
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const leaveDate = futureBusinessDate(attempt + testInfo.workerIndex * 17);
    const create = await request.post("http://127.0.0.1:8000/api/v1/leave-requests", {
      data: {
        employee_id: "emp_employee",
        end_date: leaveDate,
        note: "Playwright approval inbox request",
        start_date: leaveDate,
        type: "SICK",
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (create.ok()) {
      return;
    }
    lastCreateBody = await create.text();
  }
  throw new Error(`Could not create pending leave request: ${lastCreateBody}`);
});

async function openInbox(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pending leave" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
}

function futureBusinessDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + 30 + offset);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

test("approval inbox approve happy path", async ({ page }) => {
  await page.route("**/api/v1/leave-requests/*/approve", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await openInbox(page);

  await page.getByRole("button", { name: "Approve" }).click();

  await expect(page.getByRole("button", { name: "Approving..." })).toBeVisible();
  await expect(page.getByText("Approved")).toBeVisible();
});

test("approval inbox reject with reason", async ({ page }) => {
  await page.route("**/api/v1/leave-requests/*/reject", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await openInbox(page);

  await page.getByRole("button", { name: "Reject" }).click();
  await page.getByLabel("Reject reason").fill("Coverage is not available.");
  await page.getByRole("button", { name: "Submit rejection" }).click();

  await expect(page.getByRole("button", { name: "Rejecting..." })).toBeVisible();
  await expect(page.getByText("Rejected")).toBeVisible();
});

test("approval inbox keyboard-only path", async ({ page }) => {
  await openInbox(page);

  await page.keyboard.press("/");
  await expect(page.getByLabel("Search")).toBeFocused();
  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  await page.keyboard.press("k");
  await page.keyboard.press("Enter");
  await page.keyboard.press("r");

  await expect(page.getByLabel("Reject reason")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Reject reason")).toBeHidden();
});

test("approval inbox mid-flight Esc keeps acknowledged state", async ({ page }) => {
  await page.route("**/api/v1/leave-requests/*/approve", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await openInbox(page);

  await page.keyboard.press("a");
  await expect(page.getByRole("button", { name: "Approving..." })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Approving..." })).toBeVisible();
});

test("approval inbox failure path restores state with inline error", async ({ page }) => {
  await page.route("**/api/v1/leave-requests/*/approve", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        detail: "Approval failed.",
        errors: [],
        status: 500,
        title: "Server error",
        type: "about:blank",
      }),
      contentType: "application/problem+json",
      status: 500,
    });
  });
  await openInbox(page);

  await page.keyboard.press("a");

  await expect(page.getByText("Approval failed.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
});
