import type { VendorName } from "../vendor";

export type Link = { readonly path: string; readonly target: string };

export type ResolvedSubagent = {
  readonly sourceDirectory: string;
  readonly files: readonly string[];
};

export type LinkPlan = {
  readonly links: readonly Link[];
  readonly ownedDirectories: readonly string[];
};

export type LinkState = "in sync" | "drifted" | "not synced" | "disabled";

export type Bootstrap = {
  readonly configDirectory: string;
  readonly systemPromptFile: string;
};

export type SyncReport = {
  readonly vendors: readonly VendorName[];
  readonly stale: number;
  readonly bootstrap: Bootstrap | null;
};

export type VendorStatus = {
  readonly name: VendorName;
  readonly enabled: boolean;
  readonly linkCount: number;
  readonly state: LinkState;
};

export type StatusReport = {
  readonly promptFile: string;
  readonly vendors: readonly VendorStatus[];
};

export type LinkProblem = { readonly kind: "no-vendors-enabled" };
