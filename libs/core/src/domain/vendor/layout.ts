import { join } from "node:path";
import { err, ok, type Result } from "../shared";
import type {
  LayoutInput,
  VendorLayout,
  VendorName,
  VendorProblem,
} from "./types";
import { isVersionAtLeast } from "./version";

type SkillsHome = "own" | "shared" | { readonly repoSharedSince: string };

type VendorSpec = {
  readonly posixRoot: string;
  readonly windowsRoot: string;
  readonly instruction: string;
  readonly skillsHome: SkillsHome;
  readonly versionCommand?: string;
  readonly resourceSubdirectory?: string;
};

export const CLAUDE_CODE_SHARED_SKILLS_VERSION = "2.1.280";

export const SHARED_SKILLS_DIRECTORY = join(".agents", "skills");

const WINDOWS_CONFIG_ROOT = join("AppData", "Roaming");

const SKILLS_DIRECTORY = "skills";

const AGENTS_DIRECTORY = "agents";

const VENDOR_SEPARATOR = ",";

const VENDOR_SPECS = {
  "claude-code": {
    posixRoot: ".claude",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Claude"),
    instruction: "CLAUDE.md",
    skillsHome: { repoSharedSince: CLAUDE_CODE_SHARED_SKILLS_VERSION },
    versionCommand: "claude",
  },
  codex: {
    posixRoot: ".codex",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Codex"),
    instruction: "instructions.md",
    skillsHome: "shared",
  },
  "antigravity-cli": {
    posixRoot: ".gemini",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Gemini"),
    instruction: "GEMINI.md",
    skillsHome: "own",
    resourceSubdirectory: "antigravity-cli",
  },
  "cursor-agent": {
    posixRoot: ".cursor",
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "Cursor"),
    instruction: join("rules", "global.mdc"),
    skillsHome: "shared",
  },
  opencode: {
    posixRoot: join(".config", "opencode"),
    windowsRoot: join(WINDOWS_CONFIG_ROOT, "opencode"),
    instruction: "AGENTS.md",
    skillsHome: "shared",
  },
  "pi-agent": {
    posixRoot: join(".pi", "agent"),
    windowsRoot: join(".pi", "agent"),
    instruction: "AGENTS.md",
    skillsHome: "shared",
  },
} as const satisfies Record<VendorName, VendorSpec>;

export const VENDORS = Object.keys(VENDOR_SPECS) as readonly VendorName[];

export const VERSION_COMMANDS: Readonly<Partial<Record<VendorName, string>>> =
  Object.fromEntries(
    VENDORS.flatMap(name => {
      const command = (VENDOR_SPECS[name] as VendorSpec).versionCommand;
      return command === undefined ? [] : [[name, command]];
    }),
  );

export const isVendor = (value: string): value is VendorName =>
  (VENDORS as readonly string[]).includes(value);

export const parseVendorNames = (
  chunks: readonly string[],
): Result<VendorName[], VendorProblem> => {
  const names: VendorName[] = [];
  for (const chunk of chunks) {
    for (const raw of chunk.split(VENDOR_SEPARATOR)) {
      const name = raw.trim();
      if (!isVendor(name)) {
        return err({ kind: "unknown-vendor", name });
      }
      names.push(name);
    }
  }
  return ok(names);
};

const usesSharedSkills = (
  home: SkillsHome,
  name: VendorName,
  input: LayoutInput,
): boolean => {
  if (typeof home === "string") {
    return home === "shared";
  }
  if (input.scope !== "repo") {
    return false;
  }
  const version = input.versions[name];
  return (
    version !== undefined && isVersionAtLeast(version, home.repoSharedSince)
  );
};

export const buildVendorLayouts = (
  input: LayoutInput,
): Record<VendorName, VendorLayout> => {
  const layouts = {} as Record<VendorName, VendorLayout>;
  for (const name of VENDORS) {
    const spec: VendorSpec = VENDOR_SPECS[name];
    const root = join(
      input.root,
      input.platform === "win32" ? spec.windowsRoot : spec.posixRoot,
    );
    const resources =
      spec.resourceSubdirectory === undefined
        ? root
        : join(root, spec.resourceSubdirectory);
    const ownSkills = join(resources, SKILLS_DIRECTORY);
    const shared = usesSharedSkills(spec.skillsHome, name, input);
    layouts[name] = {
      instruction: join(root, spec.instruction),
      skills: shared ? join(input.root, SHARED_SKILLS_DIRECTORY) : ownSkills,
      legacySkills: shared ? [ownSkills] : [],
      agents: join(resources, AGENTS_DIRECTORY),
    };
  }
  return layouts;
};
