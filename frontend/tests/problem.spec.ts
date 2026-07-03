import { describe, expect, it } from "vitest";
import type { ProblemDetail } from "@/api/generated/types.gen";
import { problemDetail, problemFieldMessage } from "@/domain/lib/problem";

describe("problem+json helpers", () => {
  it("extracts problem detail and field messages", () => {
    const problem: ProblemDetail = {
      detail: "Validation failed.",
      errors: [{ code: "too_short", field: "reason", message: "Reason is too short." }],
      status: 422,
      title: "Validation failed",
    };

    expect(problemDetail(problem)).toBe("Validation failed.");
    expect(problemFieldMessage(problem, "reason")).toBe("Reason is too short.");
    expect(problemDetail("network")).toBe("The request could not be completed.");
  });
});
