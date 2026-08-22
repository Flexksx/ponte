import { join } from "./paths";

export const VENDORS = ["claude-code", "codex", "gemini-cli", "cursor-agent"] as const;

export type VendorName = (typeof VENDORS)[number];

export const isVendor = (s: string): s is VendorName => (VENDORS as readonly string[]).includes(s);

export type Platform = "posix" | "win32";

export function platform(): Platform {
  return process.platform === "win32" ? "win32" : "posix";
}

export type VendorLayout = {
  readonly instruction: string;
  readonly skills: string;
  readonly agents: string;
};

type VendorSpec = {
  readonly root: string;
  readonly instruction: string;
};

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

export function vendorLayouts(home: string, pf: Platform): Record<VendorName, VendorLayout> {
  const specs = pf === "win32" ? WIN_SPECS : POSIX_SPECS;
  const base = pf === "win32" ? join(home, "AppData", "Roaming") : home;
  const out: Record<VendorName, VendorLayout> = {} as Record<VendorName, VendorLayout>;
  for (const name of VENDORS) {
    const root = join(base, specs[name].root);
    out[name] = {
      instruction: join(root, specs[name].instruction),
      skills: join(root, "skills"),
      agents: join(root, "agents"),
    };
  }
  return out;
}
