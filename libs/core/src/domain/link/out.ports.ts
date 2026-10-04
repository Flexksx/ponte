import type { LinkPlan } from "./types";

export type LinkStore = {
  readonly read: (plan: LinkPlan) => Promise<Map<string, string>>;
  readonly apply: (plan: LinkPlan, stale: readonly string[]) => Promise<void>;
};

export type ListSubagentFiles = (directory: string) => Promise<string[]>;
