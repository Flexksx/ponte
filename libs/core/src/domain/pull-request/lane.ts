import type { PullRequestLane, PullRequestStatus } from "./types";

export const laneOf = (
  status: Omit<PullRequestStatus, "lane">,
): PullRequestLane => {
  if (status.state === "merged" || status.state === "closed") {
    return "done";
  }
  if (
    status.review === "changes requested" ||
    status.checks === "failing" ||
    status.conflicts
  ) {
    return "needs-you";
  }
  if (status.state === "draft") {
    return "draft";
  }
  return status.review === "approved" && status.checks !== "pending"
    ? "ready"
    : "in-review";
};
