import type {
  AgentSession,
  ChecksState,
  LinkState,
  PullRequestState,
  ReviewState,
} from "@ponte/core";
import type { IconName } from "@ponte/ui/icons.ts";

type Tone = "accent" | "success" | "warning" | "danger" | "neutral";

type BadgeLook = { readonly tone: Tone; readonly icon: IconName };

export const LINK_STATE_TONES: Record<LinkState, Tone> = {
  "in sync": "success",
  drifted: "warning",
  "not synced": "danger",
  disabled: "neutral",
};

export const PULL_REQUEST_LOOKS: Record<PullRequestState, BadgeLook> = {
  open: { tone: "success", icon: "pullRequest" },
  draft: { tone: "neutral", icon: "pullRequestDraft" },
  merged: { tone: "accent", icon: "merged" },
  closed: { tone: "danger", icon: "pullRequestClosed" },
};

export const REVIEW_LOOKS: Record<ReviewState, BadgeLook> = {
  approved: { tone: "success", icon: "passed" },
  "changes requested": { tone: "danger", icon: "failed" },
  "review required": { tone: "warning", icon: "pending" },
};

export const CHECKS_LOOKS: Record<ChecksState, BadgeLook> = {
  passing: { tone: "success", icon: "passed" },
  failing: { tone: "danger", icon: "failed" },
  pending: { tone: "warning", icon: "pending" },
};

export const AGENT_ICONS: Record<AgentSession["agent"], IconName> = {
  "claude-code": "claudeCode",
  "pi-agent": "pi",
};
