import type { RawVendorTable, VendorConfig } from "../config";
import type { LinkState } from "../link";
import type { SourceEntry } from "../source";
import type { VendorName } from "../vendor";

export type ProjectConfig = {
  readonly vendors?: Readonly<Partial<Record<VendorName, VendorConfig>>>;
  readonly skills: readonly SourceEntry[];
};

export type RawProjectConfig = {
  readonly vendors?: RawVendorTable;
  readonly skills?: readonly SourceEntry[];
};

export type ProjectLayout = {
  readonly root: string;
  readonly skills: string;
  readonly vendorSkillDirectories: readonly string[];
  readonly legacySkillDirectories: readonly string[];
  readonly sources: string;
  readonly lockFile: string;
};

export type Project = {
  readonly layout: ProjectLayout;
  readonly config: ProjectConfig;
};

export type ProjectSkillTarget = {
  readonly name: string;
  readonly directory: string;
};

export type LockEntry = {
  readonly source: string;
  readonly subdir?: string;
  readonly commit: string;
};

export type ProjectLock = {
  readonly skills: Readonly<Record<string, LockEntry>>;
};

export type UpdateTarget = {
  readonly name: string;
  readonly entry: SourceEntry;
};

export type ProjectStatusReport = {
  readonly root: string;
  readonly skillsDirectory: string;
  readonly linkCount: number;
  readonly state: LinkState;
};

export type ProjectSyncReport = {
  readonly root: string;
  readonly vendored: number;
  readonly linked: number;
  readonly stale: number;
};

export type UpdatedSkill = {
  readonly name: string;
  readonly commit: string | null;
};

export type ProjectUpdateReport = {
  readonly root: string;
  readonly updated: readonly UpdatedSkill[];
};

export type ProjectProblem =
  | { readonly kind: "unknown-vendored-skill"; readonly name: string }
  | { readonly kind: "modified-vendored-skills"; readonly names: string[] }
  | {
      readonly kind: "skill-renamed";
      readonly name: string;
      readonly declared: string;
    };
