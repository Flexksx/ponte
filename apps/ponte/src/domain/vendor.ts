import { join } from "node:path";

const VENDOR_SPECS = {
  "claude-code": { posixRoot: ".claude", windowsRoot: "Claude", instruction: "CLAUDE.md" },
  codex: { posixRoot: ".codex", windowsRoot: "Codex", instruction: "instructions.md" },
  "gemini-cli": { posixRoot: ".gemini", windowsRoot: "Gemini", instruction: "GEMINI.md" },
  "cursor-agent": {
    posixRoot: ".cursor",
    windowsRoot: "Cursor",
    instruction: "rules/global.mdc",
  },
} as const satisfies Record<string, VendorSpec>;

const SKILLS_DIRECTORY = "skills";

const AGENTS_DIRECTORY = "agents";

const WINDOWS_CONFIG_ROOT = join("AppData", "Roaming");

const VENDOR_SEPARATOR = ",";

export const VENDORS = Object.keys(VENDOR_SPECS) as readonly VendorName[];

type VendorSpec = {
  readonly posixRoot: string;
  readonly windowsRoot: string;
  readonly instruction: string;
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
  const base = platform === "win32" ? join(home, WINDOWS_CONFIG_ROOT) : home;
  const layouts = {} as Record<VendorName, VendorLayout>;
  for (const name of VENDORS) {
    const spec = VENDOR_SPECS[name];
    const root = join(base, platform === "win32" ? spec.windowsRoot : spec.posixRoot);
    layouts[name] = {
      instruction: join(root, spec.instruction),
      skills: join(root, SKILLS_DIRECTORY),
      agents: join(root, AGENTS_DIRECTORY),
    };
  }
  return layouts;
};
