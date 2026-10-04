import type { ConfigIssue, Result } from "@ponte/core";
import { describeProblem } from "../src/cli/problems";

export const decoded = <T>(result: Result<T, ConfigIssue[]>): T => {
  if (!result.ok) {
    throw new Error(`unexpected issues: ${issueText(result.error)}`);
  }
  return result.value;
};

export const issuesOf = <T>(
  result: Result<T, ConfigIssue[]>,
): ConfigIssue[] => {
  if (result.ok) {
    throw new Error("expected the value to have issues");
  }
  return result.error;
};

export const issueText = (issues: readonly ConfigIssue[]): string =>
  describeProblem({ kind: "invalid-config", issues });
