import { isAbsolute, join } from "node:path";
import { isGitSource } from "./source";
import { VENDORS, type VendorName } from "./vendor";

export const DEFAULT_SYSTEM_PROMPT_FILE = "AGENTS.md";
export const CONFIG_FILE = "config.toml";

export class ConfigError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(problems.join("\n"));
    this.problems = problems;
  }
}

export type VendorSkillConfig = { readonly enabled?: boolean };

export type SkillEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
  readonly vendors?: Record<string, VendorSkillConfig>;
};

export type SubagentEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type VendorConfig = { readonly enabled: boolean };

export type Config = {
  readonly systemPromptFile: string;
  readonly vendors: Record<string, VendorConfig>;
  readonly skills: Readonly<Record<string, SkillEntry>>;
  readonly subagents: Readonly<Record<string, SubagentEntry>>;
};

type SourceEntry = {
  source?: string;
  ref?: string;
  subdir?: string;
  vendors?: Record<string, VendorSkillConfig>;
};

export const defaultConfig = (): Config => ({
  systemPromptFile: DEFAULT_SYSTEM_PROMPT_FILE,
  vendors: {
    "claude-code": { enabled: true },
    codex: { enabled: true },
    "gemini-cli": { enabled: true },
    "cursor-agent": { enabled: true },
  },
  skills: {},
  subagents: {},
});

export const enabledVendors = (config: Config): VendorName[] =>
  VENDORS.filter(vendor => config.vendors[vendor]?.enabled === true);

export const isSkillEnabledForVendor = (entry: SkillEntry, vendor: string): boolean =>
  entry.vendors?.[vendor]?.enabled !== false;

const str = (value: unknown, path: string, problems: string[]): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    problems.push(`${path}: must be a string`);
    return undefined;
  }
  return value;
};

const bool = (value: unknown, path: string, problems: string[]): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    problems.push(`${path}: must be a boolean`);
    return undefined;
  }
  return value;
};

const table = (
  value: unknown,
  path: string,
  problems: string[],
): Record<string, unknown> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    problems.push(`${path}: must be a table`);
    return undefined;
  }
  return value as Record<string, unknown>;
};

const decodeEntry = (
  kind: "skills" | "subagents",
  value: unknown,
  name: string,
  problems: string[],
): SourceEntry | undefined => {
  const entry = table(value, `${kind}.${name}`, problems);
  if (!entry) return undefined;
  const out: SourceEntry = {
    source: str(entry.source, `${kind}.${name}.source`, problems),
  };
  const ref = str(entry.ref, `${kind}.${name}.ref`, problems);
  if (ref !== undefined) out.ref = ref;
  const subdir = str(entry.subdir, `${kind}.${name}.subdir`, problems);
  if (subdir !== undefined) out.subdir = subdir;
  if (kind === "skills") {
    const vendorsRaw = table(entry.vendors, `${kind}.${name}.vendors`, problems);
    if (vendorsRaw) {
      const vendors: Record<string, VendorSkillConfig> = {};
      for (const [vendor, v] of Object.entries(vendorsRaw)) {
        const vrec = table(v, `${kind}.${name}.vendors.${vendor}`, problems);
        if (!vrec) continue;
        vendors[vendor] = {
          enabled: bool(vrec.enabled, `${kind}.${name}.vendors.${vendor}.enabled`, problems),
        };
      }
      out.vendors = vendors;
    }
  }
  return out;
};

export const decodeConfig = (value: unknown): Config => {
  const problems: string[] = [];
  const root = table(value, "config", problems) ?? {};
  const systemPromptFile = str(root.system_prompt_file, "system_prompt_file", problems);

  const vendors: Record<string, VendorConfig> = {};
  const vendorsRaw = table(root.vendors, "vendors", problems);
  if (vendorsRaw) {
    for (const [name, v] of Object.entries(vendorsRaw)) {
      const vrec = table(v, `vendors.${name}`, problems);
      if (!vrec) continue;
      const enabled = bool(vrec.enabled, `vendors.${name}.enabled`, problems);
      vendors[name] = { enabled: enabled ?? false };
    }
  }

  const skills: Record<string, SkillEntry> = {};
  const skillsRaw = table(root.skills, "skills", problems);
  if (skillsRaw) {
    for (const [name, v] of Object.entries(skillsRaw)) {
      const entry = decodeEntry("skills", v, name, problems);
      if (entry?.source) skills[name] = entry as SkillEntry;
    }
  }

  const subagents: Record<string, SubagentEntry> = {};
  const subagentsRaw = table(root.subagents, "subagents", problems);
  if (subagentsRaw) {
    for (const [name, v] of Object.entries(subagentsRaw)) {
      const entry = decodeEntry("subagents", v, name, problems);
      if (entry?.source) subagents[name] = entry as SubagentEntry;
    }
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    systemPromptFile: systemPromptFile ?? DEFAULT_SYSTEM_PROMPT_FILE,
    vendors,
    skills,
    subagents,
  };
};

export const normalizeConfig = (cfg: Config, configDir: string): Config => {
  const normalize = <E extends { source: string }>(entry: E): E => {
    if (isGitSource(entry.source) || isAbsolute(entry.source)) return entry;
    return { ...entry, source: join(configDir, entry.source) };
  };
  return {
    ...cfg,
    skills: Object.fromEntries(Object.entries(cfg.skills).map(([name, e]) => [name, normalize(e)])),
    subagents: Object.fromEntries(
      Object.entries(cfg.subagents).map(([name, e]) => [name, normalize(e)]),
    ),
  };
};

const quote = (value: string) => JSON.stringify(value);

export const encodeConfig = (cfg: Config): string => {
  const out = [`system_prompt_file = ${quote(cfg.systemPromptFile)}`];
  for (const [name, vendor] of Object.entries(cfg.vendors)) {
    out.push("", `[vendors.${name}]`, `enabled = ${vendor.enabled}`);
  }
  for (const [name, skill] of Object.entries(cfg.skills)) {
    out.push("", `[skills.${name}]`, `source = ${quote(skill.source)}`);
    if (skill.ref) out.push(`ref = ${quote(skill.ref)}`);
    if (skill.subdir) out.push(`subdir = ${quote(skill.subdir)}`);
    for (const [vendor, entry] of Object.entries(skill.vendors ?? {})) {
      if (entry.enabled === undefined) continue;
      out.push(`[skills.${name}.vendors.${vendor}]`, `enabled = ${entry.enabled}`);
    }
  }
  for (const [name, subagent] of Object.entries(cfg.subagents)) {
    out.push("", `[subagents.${name}]`, `source = ${quote(subagent.source)}`);
    if (subagent.ref) out.push(`ref = ${quote(subagent.ref)}`);
    if (subagent.subdir) out.push(`subdir = ${quote(subagent.subdir)}`);
  }
  return `${out.join("\n")}\n`;
};
