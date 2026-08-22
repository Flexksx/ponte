import { mkdir } from "node:fs/promises";
import { join, configDirectoryPath } from "./paths";
import { VENDORS, type VendorName } from "./vendors";
import { isGitSource } from "./sources";
import { ConfigError } from "./hash-core";

export type VendorSkillConfig = { readonly enabled?: boolean };

export type SkillEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
  readonly vendors?: Partial<Record<string, VendorSkillConfig>>;
};

export type SubagentEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type VendorConfig = { readonly enabled: boolean };

export type Config = {
  readonly systemPromptFile: string;
  readonly vendors: Partial<Record<string, VendorConfig>>;
  readonly skills: Readonly<Record<string, SkillEntry>>;
  readonly subagents: Readonly<Record<string, SubagentEntry>>;
};

export const DEFAULT_SYSTEM_PROMPT_FILE = "AGENTS.md";
export const CONFIG_FILE = "config.toml";

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

// ---- pure helpers over a decoded config ---------------------------------------

// enabledVendors returns the enabled vendors in catalog order. This is what a
// sync targets when the user gives no explicit -a list.
export const enabledVendors = (cfg: Config): VendorName[] =>
  VENDORS.filter((vendor) => cfg.vendors[vendor]?.enabled === true);

// isSkillEnabledForVendor reports whether a skill is enabled for a vendor. Only
// an explicit enabled = false disables it; absence and enabled = true both
// leave it on.
export const isSkillEnabledForVendor = (
  entry: SkillEntry,
  vendor: string,
): boolean => entry.vendors?.[vendor]?.enabled !== false;

// ---- decoding (pure) -----------------------------------------------------------------------------------------------

const str = (
  value: unknown,
  path: string,
  problems: string[],
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    problems.push(`${path}: must be a string`);
    return undefined;
  }
  return value;
};

const bool = (
  value: unknown,
  path: string,
  problems: string[],
): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    problems.push(`${path}: must be a boolean`);
    return undefined;
  }
  return value;
};

const record = (
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

type SkillBuilder = {
  source: string;
  ref?: string;
  subdir?: string;
  vendors?: Record<string, VendorSkillConfig>;
};

const decodeSkillEntry = (
  value: unknown,
  name: string,
  problems: string[],
): SkillEntry | undefined => {
  const entry = record(value, `skills.${name}`, problems);
  if (!entry) return undefined;
  const out: SkillBuilder = {
    source: str(entry.source, `skills.${name}.source`, problems) ?? "",
  };
  const ref = str(entry.ref, `skills.${name}.ref`, problems);
  if (ref !== undefined) out.ref = ref;
  const subdir = str(entry.subdir, `skills.${name}.subdir`, problems);
  if (subdir !== undefined) out.subdir = subdir;
  const vendorsRaw = record(entry.vendors, `skills.${name}.vendors`, problems);
  if (vendorsRaw) {
    const vendors: Record<string, VendorSkillConfig> = {};
    for (const [vendor, v] of Object.entries(vendorsRaw)) {
      const vrec = record(v, `skills.${name}.vendors.${vendor}`, problems);
      if (!vrec) continue;
      const enabled = bool(vrec.enabled, `skills.${name}.vendors.${vendor}.enabled`, problems);
      vendors[vendor] = { enabled };
    }
    out.vendors = vendors;
  }
  return out;
};

type SubagentBuilder = {
  source: string;
  ref?: string;
  subdir?: string;
};

const decodeSubagentEntry = (
  value: unknown,
  name: string,
  problems: string[],
): SubagentEntry | undefined => {
  const entry = record(value, `subagents.${name}`, problems);
  if (!entry) return undefined;
  const out: SubagentBuilder = {
    source: str(entry.source, `subagents.${name}.source`, problems) ?? "",
  };
  const ref = str(entry.ref, `subagents.${name}.ref`, problems);
  if (ref !== undefined) out.ref = ref;
  const subdir = str(entry.subdir, `subagents.${name}.subdir`, problems);
  if (subdir !== undefined) out.subdir = subdir;
  return out;
};

// decodeConfig turns a parsed TOML value into a typed Config, reporting every
// problem at once. It throws ConfigError when the shape is invalid.
export function decodeConfig(value: unknown): Config {
  const problems: string[] = [];
  const root = record(value, "config", problems) ?? {};

  const systemPromptFile = str(root.system_prompt_file, "system_prompt_file", problems);

  const vendors: Record<string, VendorConfig> = {};
  const vendorsRaw = record(root.vendors, "vendors", problems);
  if (vendorsRaw) {
    for (const [name, v] of Object.entries(vendorsRaw)) {
      const vrec = record(v, `vendors.${name}`, problems);
      if (!vrec) continue;
      const enabled = bool(vrec.enabled, `vendors.${name}.enabled`, problems);
      vendors[name] = { enabled: enabled ?? false };
    }
  }

  const skills: Record<string, SkillEntry> = {};
  const skillsRaw = record(root.skills, "skills", problems);
  if (skillsRaw) {
    for (const [name, v] of Object.entries(skillsRaw)) {
      const entry = decodeSkillEntry(v, name, problems);
      if (entry) skills[name] = entry;
    }
  }

  const subagents: Record<string, SubagentEntry> = {};
  const subagentsRaw = record(root.subagents, "subagents", problems);
  if (subagentsRaw) {
    for (const [name, v] of Object.entries(subagentsRaw)) {
      const entry = decodeSubagentEntry(v, name, problems);
      if (entry) subagents[name] = entry;
    }
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    systemPromptFile: systemPromptFile ?? DEFAULT_SYSTEM_PROMPT_FILE,
    vendors,
    skills,
    subagents,
  };
}

// normalizeConfig expands relative local source paths against the config
// directory and returns a new object. It never mutates its input.
export function normalizeConfig(cfg: Config, configDir: string): Config {
  const normalizeEntry = <E extends { source: string }>(entry: E): E => {
    if (isGitSource(entry.source)) return entry;
    if (entry.source.startsWith("/") || entry.source.startsWith("\\")) {
      return entry;
    }
    return { ...entry, source: join(configDir, entry.source) };
  };
  const skills = Object.fromEntries(
    Object.entries(cfg.skills).map(([name, entry]) => [name, normalizeEntry(entry)]),
  );
  const subagents = Object.fromEntries(
    Object.entries(cfg.subagents).map(([name, entry]) => [name, normalizeEntry(entry)]),
  );
  return { ...cfg, skills, subagents };
}

// ---- IO (throws) ------------------------------------------------------------

export const configFilePath = () => join(configDirectoryPath(), CONFIG_FILE);

export const promptFilePath = (filename: string): string =>
  filename.startsWith("/") || filename.startsWith("\\")
    ? filename
    : join(configDirectoryPath(), filename);

// readConfig returns the parsed config or null when config.toml is absent.
// A malformed config throws ConfigError.
export async function readConfig(): Promise<Config | null> {
  const path = configFilePath();
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  const text = await file.text();
  const parsed = Bun.TOML.parse(text);
  const cfg = decodeConfig(parsed);
  return normalizeConfig(cfg, configDirectoryPath());
}

// toToml converts a Config to the on-disk TOML shape. The type uses camelCase,
// but the persisted keys are snake_case (system_prompt_file) to match the
// config contract and the home-manager module.
const toToml = (cfg: Config): Record<string, unknown> => ({
  system_prompt_file: cfg.systemPromptFile,
  vendors: cfg.vendors,
  skills: isEmptyRecord(cfg.skills) ? undefined : cfg.skills,
  subagents: isEmptyRecord(cfg.subagents) ? undefined : cfg.subagents,
});

const isEmptyRecord = (o: Record<string, unknown>): boolean =>
  Object.keys(o).length === 0;

export async function writeConfig(cfg: Config): Promise<void> {
  const dir = configDirectoryPath();
  await mkdir(dir, { recursive: true });
  const text = Bun.TOML.stringify(toToml(cfg));
  await Bun.write(join(dir, CONFIG_FILE), text);
}