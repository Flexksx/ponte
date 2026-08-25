import { isAbsolute, join } from "node:path";
import { isGitSource } from "./source";
import { VENDORS, type VendorName } from "./vendor";

export const DEFAULT_SYSTEM_PROMPT_FILE = "AGENTS.md";

export type VendorConfig = { readonly enabled: boolean };

export type SourceEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type Config = {
  readonly systemPromptFile: string;
  readonly vendors: Readonly<Partial<Record<VendorName, VendorConfig>>>;
  readonly skills: Readonly<Record<string, SourceEntry>>;
  readonly subagents: Readonly<Record<string, SourceEntry>>;
};

export const defaultConfig = (): Config => ({
  systemPromptFile: DEFAULT_SYSTEM_PROMPT_FILE,
  vendors: Object.fromEntries(VENDORS.map(vendor => [vendor, { enabled: true }])),
  skills: {},
  subagents: {},
});

export const enabledVendors = (config: Config): VendorName[] =>
  VENDORS.filter(vendor => config.vendors[vendor]?.enabled === true);

const withAbsoluteSource = (entry: SourceEntry, configDirectory: string): SourceEntry =>
  isGitSource(entry.source) || isAbsolute(entry.source)
    ? entry
    : { ...entry, source: join(configDirectory, entry.source) };

const absoluteSources = (
  entries: Readonly<Record<string, SourceEntry>>,
  configDirectory: string,
): Record<string, SourceEntry> =>
  Object.fromEntries(
    Object.entries(entries).map(([name, entry]) => [
      name,
      withAbsoluteSource(entry, configDirectory),
    ]),
  );

export const normalizeConfig = (config: Config, configDirectory: string): Config => ({
  ...config,
  skills: absoluteSources(config.skills, configDirectory),
  subagents: absoluteSources(config.subagents, configDirectory),
});
