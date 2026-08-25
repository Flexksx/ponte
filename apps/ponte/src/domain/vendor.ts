import { join } from "node:path";

const WINDOWS_CONFIG_ROOT = join("AppData", "Roaming");

const VENDOR_SPECS = {
  "claude-code": {
    posixRoot: ".claude",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Claude"),
    instruction: "CLAUDE.md",
  },
  codex: {
    posixRoot: ".codex",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Codex"),
    instruction: "instructions.md",
  },
  "antigravity-cli": {
    posixRoot: ".gemini",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Gemini"),
    instruction: "GEMINI.md",
    resourceSubdirectory: "antigravity-cli",
  },
  "cursor-agent": {
    posixRoot: ".cursor",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Cursor"),
    instruction: join("rules", "global.mdc"),
  },
  opencode: {
    posixRoot: join(".config", "opencode"),
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "opencode"),
    instruction: "AGENTS.md",
  },
  "pi-agent": {
    posixRoot: join(".pi", "agent"),
    windowsRoot: join(".pi", "agent"),
    instruction: "AGENTS.md",
  },
} as const satisfies Record<string, VendorSpec>;

const SKILLS_DIRECTORY = "skills";

const AGENTS_DIRECTORY = "agents";

const VENDOR_SEPARATOR = ",";

export const VENDORS = Object.keys(VENDOR_SPECS) as readonly VendorName[];

type VendorSpec = {
  readonly posixRoot: string;
  readonly windowsRoot: string;
  readonly instruction: string;
  readonly resourceSubdirectory?: string;
};

export type VendorName = keyof typeof VENDOR_SPECS;

export type Platform = "posix" | "win32";

export type VendorLayout = {
  readonly instruction: string;
  readonly skills: string;
  readonly agents: string;
};

export class UnknownVendorError extends Error {
  constructor(name: string) {
    super(`unknown agent: ${name}`);
  }
}

export const isVendor = (value: string): value is VendorName =>
  (VENDORS as readonly string[]).includes(value);

export const parseVendorNames = (chunks: readonly string[]): VendorName[] => {
  const names: VendorName[] = [];
  for (const chunk of chunks) {
    for (const raw of chunk.split(VENDOR_SEPARATOR)) {
      const name = raw.trim();
      if (!isVendor(name)) throw new UnknownVendorError(name);
      names.push(name);
    }
  }
  return names;
};

export const vendorLayouts = (
  home: string,
  platform: Platform,
): Record<VendorName, VendorLayout> => {
  const layouts = {} as Record<VendorName, VendorLayout>;
  for (const name of VENDORS) {
    const spec: VendorSpec = VENDOR_SPECS[name];
    const root = join(home, platform === "win32" ? spec.windowsRoot : spec.posixRoot);
    const resources =
      spec.resourceSubdirectory === undefined ? root : join(root, spec.resourceSubdirectory);
    layouts[name] = {
      instruction: join(root, spec.instruction),
      skills: join(resources, SKILLS_DIRECTORY),
      agents: join(resources, AGENTS_DIRECTORY),
    };
  }
  return layouts;
};
