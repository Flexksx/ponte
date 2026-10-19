import type { LinkState } from "@ponte/core";

type Tone = "success" | "warning" | "danger" | "neutral";

export const LINK_STATE_TONES: Record<LinkState, Tone> = {
  "in sync": "success",
  drifted: "warning",
  "not synced": "danger",
  disabled: "neutral",
};
