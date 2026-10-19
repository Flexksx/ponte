import type { SessionDto } from "@ponte/api-client/dto";

export const AGENT_LABELS: Record<SessionDto["agent"], string> = {
  "claude-code": "Claude Code",
  "pi-agent": "pi",
};

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
