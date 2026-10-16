import type { SourceEntry } from "../source";
import { sourceKey } from "../source";
import type { LockEntry, RepoConfig, RepoLock, UpdateTarget } from "./types";

const lockEntriesMatch = (
  left: LockEntry,
  right: LockEntry | undefined,
): boolean =>
  right !== undefined &&
  left.commit === right.commit &&
  sourceKey(left) === sourceKey(right);

export const createLockEntry = (
  entry: SourceEntry,
  commit: string,
): LockEntry => ({
  source: entry.source,
  ...(entry.subdir ? { subdir: entry.subdir } : {}),
  commit,
});

export const findLockedSkillName = (
  lock: RepoLock,
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

export const locksAreEqual = (left: RepoLock, right: RepoLock): boolean => {
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
  config: RepoConfig,
  lock: RepoLock,
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
