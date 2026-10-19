import { createPonteClient } from "@ponte/api-client/client";
import type { Problem, Result } from "@ponte/core";

export class ProblemError extends Error {}

export const load = async <T>(
  pending: Promise<Result<T, Problem>>,
): Promise<T> => {
  const result = await pending;
  if (!result.ok) {
    throw new ProblemError(result.error.kind);
  }
  return result.value;
};

export const api = createPonteClient();
