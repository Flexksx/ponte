import type { ConfigProblem } from "../config";
import type { LinkProblem, StatusReport, SyncReport } from "../link";
import type { RepoProblem, RepoStatusReport, RepoSyncReport } from "../repo";
import type { SkillProblem, SkillRow } from "../skill";
import type { SourceProblem } from "../source";
import type { VendorProblem } from "../vendor";

export type ModeProblem =
  | { readonly kind: "not-in-repo" }
  | { readonly kind: "global-options-in-repo" };

export type Problem =
  | ConfigProblem
  | LinkProblem
  | RepoProblem
  | SkillProblem
  | SourceProblem
  | VendorProblem
  | ModeProblem;

export type SyncRequest = {
  readonly promptOverride: string | undefined;
  readonly requestedVendors: readonly string[];
};

export type SyncOutcome =
  | { readonly mode: "repo"; readonly report: RepoSyncReport }
  | { readonly mode: "global"; readonly report: SyncReport };

export type StatusOutcome =
  | { readonly mode: "repo"; readonly report: RepoStatusReport }
  | { readonly mode: "global"; readonly report: StatusReport };

export type SkillListing = {
  readonly mode: "repo" | "global";
  readonly rows: readonly SkillRow[];
};
