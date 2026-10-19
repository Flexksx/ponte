import type { LucideIcon } from "@lucide/svelte";
import Bot from "@lucide/svelte/icons/bot";
import CircleCheck from "@lucide/svelte/icons/circle-check";
import CircleMinus from "@lucide/svelte/icons/circle-minus";
import CircleX from "@lucide/svelte/icons/circle-x";
import SquareTerminal from "@lucide/svelte/icons/square-terminal";
import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
import type { AgentSession, LinkState } from "@ponte/core";

type Tone = "success" | "warning" | "danger" | "neutral";

export const AGENT_ICONS: Record<AgentSession["agent"], LucideIcon> = {
  "claude-code": Bot,
  "pi-agent": SquareTerminal,
};

export const LINK_STATE_BADGES: Record<
  LinkState,
  { tone: Tone; icon: LucideIcon }
> = {
  "in sync": { tone: "success", icon: CircleCheck },
  drifted: { tone: "warning", icon: TriangleAlert },
  "not synced": { tone: "danger", icon: CircleX },
  disabled: { tone: "neutral", icon: CircleMinus },
};
