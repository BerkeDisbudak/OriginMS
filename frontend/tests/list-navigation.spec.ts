import { describe, expect, it } from "vitest";
import { moveSelection } from "@/domain/lib/list-navigation";

describe("list navigation", () => {
  it("moves selection through a visible list", () => {
    expect(moveSelection(0, 1, 3)).toBe(1);
    expect(moveSelection(2, 1, 3)).toBe(0);
    expect(moveSelection(0, -1, 3)).toBe(2);
    expect(moveSelection(0, 1, 0)).toBe(-1);
  });
});
