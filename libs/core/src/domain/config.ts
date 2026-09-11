import { isAbsolute, join } from "node:path";
import { isGitSource } from "./source";
import { parseVendorNames, VENDORS, type VendorName } from "./vendor";

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

export const DEFAULT_SYSTEM_PROMPT_FILE = "AGENTS.md";

export const createDefaultConfig = (): Config => ({
  systemPromptFile: DEFAULT_SYSTEM_PROMPT_FILE,
  vendors: Object.fromEntries(
    VENDORS.map(vendor => [vendor, { enabled: true }]),
  ),
  skills: {},
  subagents: {},
});

export const getEnabledVendors = (config: Config): VendorName[] =>
  VENDORS.filter(vendor => config.vendors[vendor]?.enabled === true);

const withAbsoluteSource = (
  entry: SourceEntry,
  configDirectory: string,
): SourceEntry =>
  isGitSource(entry.source) || isAbsolute(entry.source)
    ? entry
    : { ...entry, source: join(configDirectory, entry.source) };

export const resolveSourcePaths = (
  entries: Readonly<Record<string, SourceEntry>>,
  configDirectory: string,
): Record<string, SourceEntry> =>
  Object.fromEntries(
    Object.entries(entries).map(([name, entry]) => [
      name,
      withAbsoluteSource(entry, configDirectory),
    ]),
  );

export const resolveConfigPaths = (
  config: Config,
  configDirectory: string,
): Config => ({
  ...config,
  skills: resolveSourcePaths(config.skills, configDirectory),
  subagents: resolveSourcePaths(config.subagents, configDirectory),
});

export const resolvePromptPath = (
  configDirectory: string,
  filename: string,
): string =>
  isAbsolute(filename) ? filename : join(configDirectory, filename);

export const resolveVendors = (
  requestedVendors: readonly string[],
  config: Config,
): VendorName[] =>
  requestedVendors.length > 0
    ? parseVendorNames(requestedVendors)
    : getEnabledVendors(config);
