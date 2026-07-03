import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("approval inbox api facade", () => {
  it("keeps IO behind the generated client surface", () => {
    const source = readFileSync("frontend/src/api/approval-inbox.tsx", "utf8");

    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("axios");
    expect(source).toContain("@/api/generated/@tanstack/react-query.gen");
    expect(source).toContain("@/api/session");
  });
});

describe("shared session facade", () => {
  it("keeps IO behind the generated client surface", () => {
    const source = readFileSync("frontend/src/api/session.ts", "utf8");

    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("axios");
    expect(source).toContain("@/api/generated/sdk.gen");
  });
});
