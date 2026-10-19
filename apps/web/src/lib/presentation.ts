import type {
  ChecksState,
  LinkState,
  PullRequestState,
  ReviewState,
} from "@ponte/core";

type Tone = "accent" | "success" | "warning" | "danger" | "neutral";

export const LINK_STATE_TONES: Record<LinkState, Tone> = {
  "in sync": "success",
  drifted: "warning",
  "not synced": "danger",
  disabled: "neutral",
};

export const PULL_REQUEST_TONES: Record<PullRequestState, Tone> = {
  open: "success",
  draft: "neutral",
  merged: "accent",
  closed: "danger",
};

export const REVIEW_TONES: Record<ReviewState, Tone> = {
  approved: "success",
  "changes requested": "danger",
  "review required": "warning",
};

export const CHECKS_TONES: Record<ChecksState, Tone> = {
  passing: "success",
  failing: "danger",
  pending: "warning",
};
