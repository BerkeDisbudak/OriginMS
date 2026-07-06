import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const apiBase = "http://127.0.0.1:8000";

async function login(request: APIRequestContext, email: string) {
  const response = await request.post(`${apiBase}/api/v1/auth/login`, {
    data: { email, password: "password" },
  });
  expect(response.ok()).toBe(true);
  const { access_token: accessToken } = (await response.json()) as { access_token: string };
  return accessToken;
}

function futureBusinessDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + 30 + offset);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

test.beforeEach(async ({ request }, testInfo) => {
  const employeeToken = await login(request, "employee@origin-fgl.local");
  let lastCreateBody = "";
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const leaveDate = futureBusinessDate(attempt + testInfo.workerIndex * 17);
    const create = await request.post(`${apiBase}/api/v1/leave-requests`, {
      data: {
        employee_id: "emp_employee",
        end_date: leaveDate,
        note: "Playwright dashboard request",
        start_date: leaveDate,
        type: "SICK",
      },
      headers: {
        Authorization: `Bearer ${employeeToken}`,
      },
    });
    if (create.ok()) {
      return;
    }
    lastCreateBody = await create.text();
  }
  throw new Error(`Could not create pending leave request: ${lastCreateBody}`);
});

async function openDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();
}

function heroValue(page: Page, label: string) {
  return page.getByRole("group", { name: label }).locator(".tabular-nums");
}

test("dashboard happy path: hero metrics reflect real data, needs attention is keyboard-navigable", async ({
  page,
  request,
}) => {
  const executiveToken = await login(request, "executive@origin-fgl.local");
  const employeesResponse = await request.get(`${apiBase}/api/v1/employees?limit=100`, {
    headers: { Authorization: `Bearer ${executiveToken}` },
  });
  const employeesBody = (await employeesResponse.json()) as { items: unknown[] };
  const expectedHeadcount = employeesBody.items.length;

  await openDashboard(page);

  await expect(heroValue(page, "Headcount")).toHaveText(String(expectedHeadcount), {
    timeout: 10_000,
  });
  // Pending-approvals is a shared, globally-mutable count -- other spec
  // files' beforeEach hooks (e.g. approval-inbox.spec.ts) create/decide
  // pending requests against the same backend concurrently under CI's
  // parallel workers, so it can't be pinned to an exact snapshot taken
  // before navigation without a race. Assert it's wired to real, non-zero
  // data instead (headcount above stays exact since no test ever
  // creates/deletes employees, a genuinely stable invariant).
  const pendingText = await heroValue(page, "Pending approvals").textContent();
  expect(Number(pendingText)).toBeGreaterThan(0);

  const rows = page.locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  // First row is active by default (same convention as Employees/Approval Inbox).
  await expect(rows.first()).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("j");
  await expect(rows.first()).toHaveAttribute("aria-selected", "false");

  await page.keyboard.press("k");
  await expect(rows.first()).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Pending leave" })).toBeVisible();
});

test("dashboard hero ticker respects reduced motion and plays at most once per session", async ({
  page,
}, testInfo) => {
  const isReducedMotion = testInfo.project.name === "chromium-reduced-motion";

  await openDashboard(page);
  const headcount = heroValue(page, "Headcount");

  if (isReducedMotion) {
    // Reduced motion must render the final value immediately -- sample
    // rapidly right after the heading appears and confirm it never sits at
    // an intermediate/zero value the way a genuine 600ms count-up would.
    for (let sample = 0; sample < 5; sample += 1) {
      const text = await headcount.textContent();
      expect(text).not.toBe("0");
      await page.waitForTimeout(30);
    }
  }

  await expect(headcount).not.toHaveText("0", { timeout: 10_000 });
  // Wait past the 600ms count-up so we read the truly settled value, not an
  // in-flight intermediate one.
  await page.waitForTimeout(700);
  const settledValue = await headcount.textContent();

  // Revisit within the same browser context/session -- the ticker must not
  // replay from 0 a second time.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();
  const revisitValue = await heroValue(page, "Headcount").textContent();
  expect(revisitValue).toBe(settledValue);
  expect(revisitValue).not.toBe("0");
});
