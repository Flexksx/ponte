import { isAbsolute, join } from "node:path";
import { isGitSource } from "./source";
import { VENDORS, type VendorName } from "./vendor";

export const DEFAULT_SYSTEM_PROMPT_FILE = "AGENTS.md";

export type VendorConfig = { readonly enabled: boolean };

export type VendorSkillConfig = { readonly enabled?: boolean };

export type SkillEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
  readonly vendors?: Readonly<Partial<Record<VendorName, VendorSkillConfig>>>;
};

export type SubagentEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type Config = {
  readonly systemPromptFile: string;
  readonly vendors: Readonly<Partial<Record<VendorName, VendorConfig>>>;
  readonly skills: Readonly<Record<string, SkillEntry>>;
  readonly subagents: Readonly<Record<string, SubagentEntry>>;
};

export const defaultConfig = (): Config => ({
  systemPromptFile: DEFAULT_SYSTEM_PROMPT_FILE,
  vendors: Object.fromEntries(VENDORS.map(vendor => [vendor, { enabled: true }])),
  skills: {},
  subagents: {},
});

export const enabledVendors = (config: Config): VendorName[] =>
  VENDORS.filter(vendor => config.vendors[vendor]?.enabled === true);

export const isSkillEnabledForVendor = (entry: SkillEntry, vendor: VendorName): boolean =>
  entry.vendors?.[vendor]?.enabled !== false;

export const normalizeConfig = (config: Config, configDirectory: string): Config => {
  const absolute = <E extends { source: string }>(entry: E): E => {
    if (isGitSource(entry.source) || isAbsolute(entry.source)) return entry;
    return { ...entry, source: join(configDirectory, entry.source) };
  };
  return {
    ...config,
    skills: Object.fromEntries(
      Object.entries(config.skills).map(([name, entry]) => [name, absolute(entry)]),
    ),
    subagents: Object.fromEntries(
      Object.entries(config.subagents).map(([name, entry]) => [name, absolute(entry)]),
    ),
  };
};
