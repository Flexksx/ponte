export type Platform = "posix" | "win32";

export type VendorName =
  | "claude-code"
  | "codex"
  | "antigravity-cli"
  | "cursor-agent"
  | "opencode"
  | "pi-agent";

export type VendorVersions = Readonly<Partial<Record<VendorName, string>>>;

export type LayoutInput = {
  readonly root: string;
  readonly platform: Platform;
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
