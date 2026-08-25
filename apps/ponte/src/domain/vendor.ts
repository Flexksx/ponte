import { join } from "node:path";

export const VENDORS = ["claude-code", "codex", "gemini-cli", "cursor-agent"] as const;

const POSIX_SPECS: Record<VendorName, VendorSpec> = {
  "claude-code": { root: ".claude", instruction: "CLAUDE.md" },
  codex: { root: ".codex", instruction: "instructions.md" },
  "gemini-cli": { root: ".gemini", instruction: "GEMINI.md" },
  "cursor-agent": { root: ".cursor", instruction: "rules/global.mdc" },
};

const WIN_SPECS: Record<VendorName, VendorSpec> = {
  "claude-code": { root: "Claude", instruction: "CLAUDE.md" },
  codex: { root: "Codex", instruction: "instructions.md" },
  "gemini-cli": { root: "Gemini", instruction: "GEMINI.md" },
  "cursor-agent": { root: "Cursor", instruction: "rules/global.mdc" },
};

export type VendorName = (typeof VENDORS)[number];

export type Platform = "posix" | "win32";

export type VendorLayout = {
  readonly instruction: string;
  readonly skills: string;
  readonly agents: string;
};

type VendorSpec = {
  readonly root: string;
  readonly instruction: string;
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
    for (const raw of chunk.split(",")) {
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
  const specs = platform === "win32" ? WIN_SPECS : POSIX_SPECS;
  const base = platform === "win32" ? join(home, "AppData", "Roaming") : home;
  const layouts = {} as Record<VendorName, VendorLayout>;
  for (const name of VENDORS) {
    const root = join(base, specs[name].root);
    layouts[name] = {
      instruction: join(root, specs[name].instruction),
      skills: join(root, "skills"),
      agents: join(root, "agents"),
    };
  }
  return layouts;
};
