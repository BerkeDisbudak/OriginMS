import type { ProblemDetail } from "@/api/generated/types.gen";

export function problemFromUnknown(error: unknown): ProblemDetail | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const candidate = error as Partial<ProblemDetail>;
  if (typeof candidate.detail === "string" && typeof candidate.status === "number") {
    return candidate as ProblemDetail;
  }
  return null;
}

export function problemFieldMessage(error: unknown, field: string): string | null {
  const problem = problemFromUnknown(error);
  const fieldError = problem?.errors?.find((item) => item.field === field);
  return fieldError?.message ?? null;
}

export function problemDetail(error: unknown): string {
  return problemFromUnknown(error)?.detail ?? "The request could not be completed.";
}
