import { expect, type Locator, type Page, test } from "@playwright/test";

// Regression coverage for the transition-colors/outline-color focus-ring
// bug (fixed in 85004e0): tokens.css's `focus-ring` utility sets
// outline-color: #6366f1 (the accent token), which a browser resolves to
// rgb(99, 102, 241). That fix was only ever verified manually via
// screenshots -- this makes it a real, automated CI check via genuine
// keyboard Tab traversal (never .focus(), including the app's own "/"
// shortcut, which calls .focus() internally and can't be trusted for
// :focus-visible style checks the same way real Tab presses can), on the
// two ui/ primitives that actually render in production today.
//
// Select is not covered here: it has zero production usage (confirmed by
// the pre-Phase 4 health-check audit -- it only appears in its own
// Storybook story). Add its check here once a real feature renders one.

const ACCENT_RGB = "rgb(99, 102, 241)";

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
        note: "Playwright focus-ring request",
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

function futureBusinessDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + 30 + offset);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

async function openInbox(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pending leave" })).toBeVisible();
  // Extended timeout: same load-sensitive dialog/element-visibility flake
  // already hardened in employees.spec.ts (see that file's focus-trap test).
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible({ timeout: 10_000 });
}

// Real Tab traversal only -- no .focus(), including the app's own "/"
// shortcut, since programmatic focus doesn't reliably engage Chromium's
// :focus-visible heuristic the way genuine keyboard-driven focus does.
async function tabUntilFocused(page: Page, target: Locator, maxPresses = 60): Promise<void> {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    const isFocused = await target.evaluate((el) => el === document.activeElement);
    if (isFocused) {
      return;
    }
  }
  throw new Error("Could not reach target element via Tab traversal within max presses");
}

test("Button: focus-visible ring resolves to the accent color", async ({ page }) => {
  await openInbox(page);

  const approveButton = page.getByRole("button", { name: "Approve" });
  await tabUntilFocused(page, approveButton);
  await expect(approveButton).toBeFocused();

  const outlineColor = await approveButton.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(outlineColor).toBe(ACCENT_RGB);
});

test("Input: focus-within ring on the wrapper resolves to the accent color", async ({ page }) => {
  await openInbox(page);

  const search = page.getByLabel("Search");
  await tabUntilFocused(page, search);
  await expect(search).toBeFocused();

  // The ring lives on the wrapping span (`focus-within:focus-ring` in
  // input.tsx), not the <input> itself (which has outline-none) -- check
  // the parent, matching what a sighted user actually sees drawn.
  const wrapperOutlineColor = await search.evaluate(
    (el) => el.parentElement && getComputedStyle(el.parentElement).outlineColor,
  );
  expect(wrapperOutlineColor).toBe(ACCENT_RGB);
});
