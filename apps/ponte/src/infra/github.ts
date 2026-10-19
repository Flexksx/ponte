import type {
  ChecksState,
  PullRequestLookup,
  PullRequestState,
  PullRequestStatus,
  ReadPullRequest,
  ReviewState,
} from "@ponte/core";
import { $ } from "bun";
import { z } from "zod";

type PullRequestJson = z.infer<typeof PULL_REQUEST_JSON>;

const GH_FIELDS = "title,state,isDraft,reviewDecision,statusCheckRollup";

const GH_MISSING = "install the GitHub CLI (gh) to see pull request state";

const FAILED_OUTCOMES = new Set([
  "FAILURE",
  "ERROR",
  "CANCELLED",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE",
]);

const PASSED_OUTCOMES = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);

const PENDING_OUTCOME = "PENDING";

const REVIEWS: Record<string, ReviewState> = {
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes requested",
  REVIEW_REQUIRED: "review required",
};

const PULL_REQUEST_JSON = z.object({
  title: z.string(),
  state: z.enum(["OPEN", "CLOSED", "MERGED"]),
  isDraft: z.boolean(),
  reviewDecision: z.string(),
  statusCheckRollup: z.array(
    z.object({
      conclusion: z.string().nullish(),
      state: z.string().nullish(),
    }),
  ),
});

const summarizeChecks = (
  checks: PullRequestJson["statusCheckRollup"],
): ChecksState | null => {
  if (checks.length === 0) {
    return null;
  }
  const outcomes = checks.map(
    check => check.conclusion || check.state || PENDING_OUTCOME,
  );
  if (outcomes.some(outcome => FAILED_OUTCOMES.has(outcome))) {
    return "failing";
  }
  return outcomes.every(outcome => PASSED_OUTCOMES.has(outcome))
    ? "passing"
    : "pending";
};

const pullRequestState = (json: PullRequestJson): PullRequestState => {
  if (json.state === "MERGED") {
    return "merged";
  }
  if (json.state === "CLOSED") {
    return "closed";
  }
  return json.isDraft ? "draft" : "open";
};

export const toPullRequestStatus = (
  json: PullRequestJson,
): PullRequestStatus => ({
  title: json.title,
  state: pullRequestState(json),
  review: REVIEWS[json.reviewDecision] ?? null,
  checks: summarizeChecks(json.statusCheckRollup),
});

const parseOutput = (url: string, output: string): PullRequestLookup => {
  try {
    const parsed = PULL_REQUEST_JSON.safeParse(JSON.parse(output));
    return parsed.success
      ? { kind: "found", url, status: toPullRequestStatus(parsed.data) }
      : { kind: "unavailable", url, reason: z.prettifyError(parsed.error) };
  } catch (error) {
    return { kind: "unavailable", url, reason: String(error) };
  }
};

export const readPullRequest: ReadPullRequest = async url => {
  if (Bun.which("gh") === null) {
    return { kind: "unavailable", url, reason: GH_MISSING };
  }
  const result = await $`gh pr view ${url} --json ${GH_FIELDS}`
    .nothrow()
    .quiet();
  if (result.exitCode !== 0) {
    const reason = result.stderr.toString().trim().split("\n")[0] ?? "";
    return { kind: "unavailable", url, reason };
  }
  return parseOutput(url, result.stdout.toString());
};
