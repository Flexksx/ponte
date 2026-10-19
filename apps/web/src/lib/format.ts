import type { AgentSession, SourceEntry } from "@ponte/core";

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const JUST_NOW_SECONDS = 60;

const TIME_UNITS: ReadonlyArray<
  readonly [Intl.RelativeTimeFormatUnit, number]
> = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

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

export const countOf = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export const relativeTime = (iso: string, now: number = Date.now()): string => {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  const unit = TIME_UNITS.find(([, size]) => Math.abs(seconds) >= size);
  return Math.abs(seconds) < JUST_NOW_SECONDS || unit === undefined
    ? "just now"
    : RELATIVE_TIME.format(Math.round(seconds / unit[1]), unit[0]);
};
