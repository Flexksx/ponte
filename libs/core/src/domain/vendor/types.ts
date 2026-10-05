export type Platform = "posix" | "win32";

export type VendorName =
  | "claude-code"
  | "codex"
  | "antigravity-cli"
  | "cursor-agent"
  | "opencode"
  | "pi-agent";

export type VendorVersions = Readonly<Partial<Record<VendorName, string>>>;

export type LayoutScope = "global" | "project";

export type LayoutInput = {
  readonly root: string;
  readonly platform: Platform;
  readonly scope: LayoutScope;
  readonly versions: VendorVersions;
};

export type VendorLayout = {
  readonly instruction: string;
  readonly skills: string;
  readonly legacySkills: readonly string[];
  readonly agents: string;
};

export type VendorProblem = {
  readonly kind: "unknown-vendor";
  readonly name: string;
};
