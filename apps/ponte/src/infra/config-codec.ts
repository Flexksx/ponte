import {
  DEFAULT_SYSTEM_PROMPT_FILE,
  type Config,
  type SkillEntry,
  type SubagentEntry,
  type VendorConfig,
  type VendorSkillConfig,
} from "../domain/config";

const BARE_KEY = /^[A-Za-z0-9_-]+$/;

export class ConfigError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(problems.join("\n"));
    this.problems = problems;
  }
}

const readString = (value: unknown, path: string, problems: string[]): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    problems.push(`${path}: must be a string`);
    return undefined;
  }
  return value;
};

const readBoolean = (value: unknown, path: string, problems: string[]): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    problems.push(`${path}: must be a boolean`);
    return undefined;
  }
  return value;
};

const readTable = (
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

const readEntries = <E>(
  value: unknown,
  path: string,
  problems: string[],
  readEntry: (raw: Record<string, unknown>, path: string, problems: string[]) => E | undefined,
): Record<string, E> => {
  const entries: Record<string, E> = {};
  const table = readTable(value, path, problems);
  if (!table) return entries;
  for (const [name, raw] of Object.entries(table)) {
    const rawEntry = readTable(raw, `${path}.${name}`, problems);
    if (!rawEntry) continue;
    const entry = readEntry(rawEntry, `${path}.${name}`, problems);
    if (entry !== undefined) entries[name] = entry;
  }
  return entries;
};

const readVendorConfig = (
  raw: Record<string, unknown>,
  path: string,
  problems: string[],
): VendorConfig => ({ enabled: readBoolean(raw.enabled, `${path}.enabled`, problems) ?? false });

const readSkillVendors = (
  value: unknown,
  path: string,
  problems: string[],
): Record<string, VendorSkillConfig> | undefined => {
  if (value === undefined) return undefined;
  return readEntries<VendorSkillConfig>(value, path, problems, (raw, entryPath) => ({
    enabled: readBoolean(raw.enabled, `${entryPath}.enabled`, problems),
  }));
};

const readSubagentEntry = (
  raw: Record<string, unknown>,
  path: string,
  problems: string[],
): SubagentEntry | undefined => {
  const source = readString(raw.source, `${path}.source`, problems);
  if (source === undefined) return undefined;
  const ref = readString(raw.ref, `${path}.ref`, problems);
  const subdir = readString(raw.subdir, `${path}.subdir`, problems);
  return { source, ...(ref !== undefined && { ref }), ...(subdir !== undefined && { subdir }) };
};

const readSkillEntry = (
  raw: Record<string, unknown>,
  path: string,
  problems: string[],
): SkillEntry | undefined => {
  const base = readSubagentEntry(raw, path, problems);
  if (base === undefined) return undefined;
  const vendors = readSkillVendors(raw.vendors, `${path}.vendors`, problems);
  return { ...base, ...(vendors !== undefined && { vendors }) };
};

export const decodeConfig = (value: unknown): Config => {
  const problems: string[] = [];
  const root = readTable(value, "config", problems) ?? {};
  const config: Config = {
    systemPromptFile:
      readString(root.system_prompt_file, "system_prompt_file", problems) ??
      DEFAULT_SYSTEM_PROMPT_FILE,
    vendors: readEntries(root.vendors, "vendors", problems, readVendorConfig),
    skills: readEntries(root.skills, "skills", problems, readSkillEntry),
    subagents: readEntries(root.subagents, "subagents", problems, readSubagentEntry),
  };
  if (problems.length > 0) throw new ConfigError(problems);
  return config;
};

const tomlKey = (name: string): string => (BARE_KEY.test(name) ? name : JSON.stringify(name));

const tomlString = (text: string): string => JSON.stringify(text);

export const encodeConfig = (config: Config): string => {
  const lines = [`system_prompt_file = ${tomlString(config.systemPromptFile)}`];
  for (const [name, vendor] of Object.entries(config.vendors)) {
    lines.push("", `[vendors.${tomlKey(name)}]`, `enabled = ${vendor.enabled}`);
  }
  for (const [name, skill] of Object.entries(config.skills)) {
    lines.push("", `[skills.${tomlKey(name)}]`, `source = ${tomlString(skill.source)}`);
    if (skill.ref) lines.push(`ref = ${tomlString(skill.ref)}`);
    if (skill.subdir) lines.push(`subdir = ${tomlString(skill.subdir)}`);
    for (const [vendor, entry] of Object.entries(skill.vendors ?? {})) {
      if (entry.enabled === undefined) continue;
      lines.push(
        `[skills.${tomlKey(name)}.vendors.${tomlKey(vendor)}]`,
        `enabled = ${entry.enabled}`,
      );
    }
  }
  for (const [name, subagent] of Object.entries(config.subagents)) {
    lines.push("", `[subagents.${tomlKey(name)}]`, `source = ${tomlString(subagent.source)}`);
    if (subagent.ref) lines.push(`ref = ${tomlString(subagent.ref)}`);
    if (subagent.subdir) lines.push(`subdir = ${tomlString(subagent.subdir)}`);
  }
  return `${lines.join("\n")}\n`;
};
