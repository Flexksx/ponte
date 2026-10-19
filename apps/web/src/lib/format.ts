import type { AgentSession, SourceEntry } from "@ponte/core";

export const AGENT_LABELS: Record<AgentSession["agent"], string> = {
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

export const sourceText = (entry: SourceEntry): string =>
  [
    entry.source,
    entry.ref && `@ ${entry.ref}`,
    entry.subdir && `/ ${entry.subdir}`,
  ]
    .filter(Boolean)
    .join(" ");
