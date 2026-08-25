import {
  type Config,
  DEFAULT_SYSTEM_PROMPT_FILE,
  type SourceEntry,
  type VendorConfig,
} from "../domain/config";
import { isVendor, VENDORS, type VendorName } from "../domain/vendor";

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

const readVendorEntries = <E>(
  value: unknown,
  path: string,
  problems: string[],
  readEntry: (raw: Record<string, unknown>, path: string, problems: string[]) => E | undefined,
): Partial<Record<VendorName, E>> => {
  const entries: Partial<Record<VendorName, E>> = {};
  for (const [name, entry] of Object.entries(readEntries(value, path, problems, readEntry))) {
    if (!isVendor(name)) {
      problems.push(`${path}.${name}: unknown agent, expected one of ${VENDORS.join(", ")}`);
      continue;
    }
    entries[name] = entry;
  }
  return entries;
};

const readVendorConfig = (
  raw: Record<string, unknown>,
  path: string,
  problems: string[],
): VendorConfig => ({ enabled: readBoolean(raw.enabled, `${path}.enabled`, problems) ?? false });

const readSourceEntry = (
  raw: Record<string, unknown>,
  path: string,
  problems: string[],
): SourceEntry | undefined => {
  const source = readString(raw.source, `${path}.source`, problems);
  if (source === undefined) return undefined;
  const ref = readString(raw.ref, `${path}.ref`, problems);
  const subdir = readString(raw.subdir, `${path}.subdir`, problems);
  return { source, ...(ref !== undefined && { ref }), ...(subdir !== undefined && { subdir }) };
};

export const decodeConfig = (value: unknown): Config => {
  const problems: string[] = [];
  const root = readTable(value, "config", problems) ?? {};
  const config: Config = {
    systemPromptFile:
      readString(root.system_prompt_file, "system_prompt_file", problems) ??
      DEFAULT_SYSTEM_PROMPT_FILE,
    vendors: readVendorEntries(root.vendors, "vendors", problems, readVendorConfig),
    skills: readEntries(root.skills, "skills", problems, readSourceEntry),
    subagents: readEntries(root.subagents, "subagents", problems, readSourceEntry),
  };
  if (problems.length > 0) throw new ConfigError(problems);
  return config;
};

const tomlKey = (name: string): string => (BARE_KEY.test(name) ? name : JSON.stringify(name));

const tomlString = (text: string): string => JSON.stringify(text);

export const encodeConfig = (config: Config): string => {
  const lines = [`system_prompt_file = ${tomlString(config.systemPromptFile)}`];
  for (const [name, vendor] of Object.entries(config.vendors)) {
    if (vendor === undefined) continue;
    lines.push("", `[vendors.${tomlKey(name)}]`, `enabled = ${vendor.enabled}`);
  }
  for (const table of ["skills", "subagents"] as const) {
    for (const [name, entry] of Object.entries(config[table])) {
      lines.push("", `[${table}.${tomlKey(name)}]`, `source = ${tomlString(entry.source)}`);
      if (entry.ref) lines.push(`ref = ${tomlString(entry.ref)}`);
      if (entry.subdir) lines.push(`subdir = ${tomlString(entry.subdir)}`);
    }
  }
  return `${lines.join("\n")}\n`;
};
