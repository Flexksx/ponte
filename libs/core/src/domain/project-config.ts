import {
  resolveSourcePaths,
  type SourceEntry,
  sourceKey,
  type VendorConfig,
} from "./config";
import { err, ok, type Result } from "./result";
import { VENDORS, type VendorName } from "./vendor";

export type ProjectConfig = {
  readonly vendors?: Readonly<Partial<Record<VendorName, VendorConfig>>>;
  readonly skills: readonly SourceEntry[];
};

export type LockEntry = {
  readonly source: string;
  readonly subdir?: string;
  readonly commit: string;
};

export type ProjectLock = {
  readonly skills: Readonly<Record<string, LockEntry>>;
};

export type ProjectSkillRow = {
  readonly name: string | null;
  readonly entry: SourceEntry;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export type UpdateTarget = {
  readonly name: string;
  readonly entry: SourceEntry;
};

export const PROJECT_CONFIG_FILE = "ponte.toml";

const lockEntriesMatch = (
  left: LockEntry,
  right: LockEntry | undefined,
): boolean =>
  right !== undefined &&
  left.commit === right.commit &&
  sourceKey(left) === sourceKey(right);

export const getProjectEnabledVendors = (
  config: ProjectConfig,
): VendorName[] | undefined => {
  if (config.vendors === undefined) {
    return undefined;
  }
  return VENDORS.filter(name => config.vendors?.[name]?.enabled === true);
};

export const resolveProjectConfigPaths = (
  config: ProjectConfig,
  root: string,
): ProjectConfig => ({
  ...(config.vendors !== undefined && { vendors: config.vendors }),
  skills: resolveSourcePaths(config.skills, root),
});

export const createLockEntry = (
  entry: SourceEntry,
  commit: string,
): LockEntry => ({
  source: entry.source,
  ...(entry.subdir ? { subdir: entry.subdir } : {}),
  commit,
});

export const findLockedSkillName = (
  lock: ProjectLock,
  entry: SourceEntry,
): string | null => {
  const key = sourceKey(entry);
  for (const [name, locked] of Object.entries(lock.skills)) {
    if (sourceKey(locked) === key) {
      return name;
    }
  }
  return null;
};

export const locksAreEqual = (
  left: ProjectLock,
  right: ProjectLock,
): boolean => {
  const names = Object.keys(left.skills);
  if (names.length !== Object.keys(right.skills).length) {
    return false;
  }
  return names.every(name => {
    const entry = left.skills[name];
    return entry !== undefined && lockEntriesMatch(entry, right.skills[name]);
  });
};

export const buildUpdateTargets = (
  config: ProjectConfig,
  lock: ProjectLock,
): UpdateTarget[] => {
  const targets: UpdateTarget[] = [];
  for (const [name, locked] of Object.entries(lock.skills)) {
    const entry = config.skills.find(
      candidate => sourceKey(candidate) === sourceKey(locked),
    );
    if (entry !== undefined) {
      targets.push({ name, entry });
    }
  }
  return targets;
};

export const findUpdateTarget = (
  targets: readonly UpdateTarget[],
  name: string,
  sourcesDirectory: string,
): Result<UpdateTarget, string> => {
  const target = targets.find(candidate => candidate.name === name);
  if (target === undefined) {
    return err(
      `unknown vendored skill: ${name} - ponte update works on the git skills that ${PROJECT_CONFIG_FILE} declares and ${sourcesDirectory} holds`,
    );
  }
  return ok(target);
};
