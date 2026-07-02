import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const tokensPath = resolve(root, "frontend/src/ui/tokens.css");
const tokens = readFileSync(tokensPath, "utf8");

const requiredTokens = new Map([
  ["--bg", "#0F0F11"],
  ["--surface", "#18181B"],
  ["--surface-raised", "#1F1F24"],
  ["--border", "rgba(255,255,255,0.08)"],
  ["--border-strong", "rgba(255,255,255,0.14)"],
  ["--text-primary", "#F4F4F5"],
  ["--text-secondary", "#A1A1AA"],
  ["--text-tertiary", "#71717A"],
  ["--light-bg", "#FAFAF9"],
  ["--light-surface", "#FFFFFF"],
  ["--light-border", "#E7E5E4"],
  ["--light-text-primary", "#1C1917"],
  ["--light-text-secondary", "#57534E"],
  ["--light-text-tertiary", "#A8A29E"],
  ["--accent", "#6366F1"],
  ["--accent-subtle", "rgba(99,102,241,0.10)"],
  ["--success", "#22C55E"],
  ["--warning", "#F59E0B"],
  ["--danger", "#EF4444"],
  ["--info", "var(--accent)"],
  ["--motion-instant", "0ms"],
  ["--motion-fast", "120ms"],
  ["--motion-base", "180ms"],
  ["--motion-panel", "280ms"],
  ["--ease-out", "cubic-bezier(0.2, 0, 0, 1)"],
  ["--ease-in-out", "cubic-bezier(0.4, 0, 0.2, 1)"],
]);

describe("doctrine tokens", () => {
  it("keeps UX_DOCTRINE section 3 values in the Tailwind v4 theme source", () => {
    expect(tokens).toContain("@theme");

    for (const [name, value] of requiredTokens) {
      expect(tokens).toContain(`${name}: ${value};`);
    }
  });

  it("keeps hex colors isolated to tokens.css", () => {
    const files = [
      "frontend/src/app/globals.css",
      "frontend/src/app/layout.tsx",
      "frontend/src/app/page.tsx",
    ];

    for (const file of files) {
      const content = readFileSync(resolve(root, file), "utf8");
      expect(content).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
