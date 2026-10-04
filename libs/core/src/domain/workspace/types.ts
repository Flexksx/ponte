import type { ConfigProblem } from "../config";
import type { LinkProblem, StatusReport, SyncReport } from "../link";
import type {
  ProjectProblem,
  ProjectStatusReport,
  ProjectSyncReport,
} from "../project";
import type { SkillProblem, SkillRow } from "../skill";
import type { SourceProblem } from "../source";
import type { VendorProblem } from "../vendor";

export type WorkspaceProblem =
  | { readonly kind: "not-in-project" }
  | { readonly kind: "global-options-in-project" };

export type Problem =
  | ConfigProblem
  | LinkProblem
  | ProjectProblem
  | SkillProblem
  | SourceProblem
  | VendorProblem
  | WorkspaceProblem;

export type SyncRequest = {
  readonly promptOverride: string | undefined;
  readonly requestedVendors: readonly string[];
};

export type SyncOutcome =
  | { readonly mode: "project"; readonly report: ProjectSyncReport }
  | { readonly mode: "global"; readonly report: SyncReport };

export type StatusOutcome =
  | { readonly mode: "project"; readonly report: ProjectStatusReport }
  | { readonly mode: "global"; readonly report: StatusReport };

export type SkillListing = {
  readonly mode: "project" | "global";
  readonly rows: readonly SkillRow[];
};
