import {
  resolveSourcePaths,
  type SourceEntry,
  type VendorConfig,
} from "./config";
import { err, ok, type Result } from "./result";
import { isGitSource } from "./source";
import { VENDORS, type VendorName } from "./vendor";

export type ProjectConfig = {
  readonly vendors?: Readonly<Partial<Record<VendorName, VendorConfig>>>;
  readonly skills: Readonly<Record<string, SourceEntry>>;
};

export type LockEntry = { readonly commit: string };

export type ProjectLock = {
  readonly skills: Readonly<Record<string, LockEntry>>;
};

export type ProjectSkillRow = {
  readonly name: string;
  readonly entry: SourceEntry;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export const PROJECT_CONFIG_FILE = "ponte.toml";

export const getProjectEnabledVendors = (
  config: ProjectConfig,
): VendorName[] | undefined => {
  if (config.vendors === undefined) return undefined;
  return VENDORS.filter(name => config.vendors?.[name]?.enabled === true);
};

export const resolveProjectConfigPaths = (
  config: ProjectConfig,
  root: string,
): ProjectConfig => ({
  ...(config.vendors !== undefined && { vendors: config.vendors }),
  skills: resolveSourcePaths(config.skills, root),
});

export const getUpdatableSkills = (
  config: ProjectConfig,
): readonly [string, SourceEntry][] =>
  Object.entries(config.skills).filter(([, entry]) =>
    isGitSource(entry.source),
  );

export const getUpdatableSkill = (
  config: ProjectConfig,
  name: string,
): Result<readonly [string, SourceEntry], string> => {
  const entry = config.skills[name];
  if (entry === undefined) return err(`unknown project skill: ${name}`);
  if (!isGitSource(entry.source)) {
    return err(`${name} is a local skill, so there is nothing to update`);
  }
  return ok([name, entry] as const);
};

export const buildSkillRows = (
  skills: Readonly<Record<string, SourceEntry>>,
  lock: ProjectLock,
): ProjectSkillRow[] =>
  Object.entries(skills).map(([name, entry]) => ({
    name,
    entry,
    vendored: isGitSource(entry.source),
    commit: lock.skills[name]?.commit ?? null,
  }));
