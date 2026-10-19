export type PullRequestState = "open" | "draft" | "merged" | "closed";

export type ReviewState = "approved" | "changes requested" | "review required";

export type ChecksState = "passing" | "failing" | "pending";

export type PullRequestLane =
  | "needs-you"
  | "ready"
  | "in-review"
  | "draft"
  | "done";

export type PullRequestStatus = {
  readonly title: string;
  readonly state: PullRequestState;
  readonly review: ReviewState | null;
  readonly checks: ChecksState | null;
  readonly conflicts: boolean;
  readonly updatedAt: string;
  readonly lane: PullRequestLane;
};

export type PullRequestLookup =
  | {
      readonly kind: "found";
      readonly url: string;
      readonly status: PullRequestStatus;
    }
  | {
      readonly kind: "unavailable";
      readonly url: string;
      readonly reason: string;
    };
