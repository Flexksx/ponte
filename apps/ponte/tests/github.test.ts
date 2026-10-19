import { describe, expect, it } from "bun:test";
import { toPullRequestStatus } from "../src/infra/github";

const pullRequest = (overrides: object) => ({
  title: "t",
  state: "OPEN" as const,
  isDraft: false,
  reviewDecision: "",
  mergeable: "MERGEABLE",
  updatedAt: "2026-10-19T10:00:00Z",
  statusCheckRollup: [],
  ...overrides,
});

describe("toPullRequestStatus", () => {
  it("reads a merged pull request with passing checks and no review", () => {
    const status = toPullRequestStatus(
      pullRequest({
        state: "MERGED",
        statusCheckRollup: [
          { conclusion: "SUCCESS" },
          { conclusion: "SKIPPED" },
        ],
      }),
    );
    expect(status).toEqual({
      title: "t",
      state: "merged",
      review: null,
      checks: "passing",
      conflicts: false,
      updatedAt: "2026-10-19T10:00:00Z",
      lane: "done",
    });
  });

  it("reports a draft as draft and a failing check over a pending one", () => {
    const status = toPullRequestStatus(
      pullRequest({
        isDraft: true,
        reviewDecision: "CHANGES_REQUESTED",
        statusCheckRollup: [{ conclusion: "" }, { conclusion: "FAILURE" }],
      }),
    );
    expect(status.state).toBe("draft");
    expect(status.review).toBe("changes requested");
    expect(status.checks).toBe("failing");
    expect(status.lane).toBe("needs-you");
  });

  it("puts an approved open pull request with passing checks in the ready lane, unless it conflicts", () => {
    const approved = {
      reviewDecision: "APPROVED",
      statusCheckRollup: [{ conclusion: "SUCCESS" }],
    };
    expect(toPullRequestStatus(pullRequest(approved)).lane).toBe("ready");
    expect(
      toPullRequestStatus(
        pullRequest({ ...approved, mergeable: "CONFLICTING" }),
      ).lane,
    ).toBe("needs-you");
    expect(
      toPullRequestStatus(pullRequest({ reviewDecision: "REVIEW_REQUIRED" }))
        .lane,
    ).toBe("in-review");
  });

  it("treats a running check run and a pending commit status as pending", () => {
    const status = toPullRequestStatus(
      pullRequest({
        statusCheckRollup: [{ conclusion: "" }, { state: "SUCCESS" }],
      }),
    );
    expect(status.checks).toBe("pending");
    expect(
      toPullRequestStatus(
        pullRequest({ statusCheckRollup: [{ state: "PENDING" }] }),
      ).checks,
    ).toBe("pending");
  });
});
