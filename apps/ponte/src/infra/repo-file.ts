import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  type ConfigProblem,
  err,
  ok,
  REPO_CONFIG_FILE,
  type RepoConfig,
  type RepoFiles,
  type RepoLayout,
  type RepoLock,
  type Result,
} from "@ponte/core";
import {
  decodeLock,
  decodeRepoConfig,
  encodeLock,
  parseToml,
} from "./config-codec";

export const getAncestorDirectories = (start: string): readonly string[] => {
  const directories = [start];
  let current = start;
  let parent = dirname(start);
  while (parent !== current) {
    directories.push(parent);
    current = parent;
    parent = dirname(parent);
  }
  return directories;
};

export const findRepoRoot = async (start: string): Promise<string | null> => {
  for (const directory of getAncestorDirectories(start)) {
    if (await Bun.file(join(directory, REPO_CONFIG_FILE)).exists()) {
      return directory;
    }
  }
  return null;
};

export const readRepoConfig = async (
  root: string,
): Promise<Result<RepoConfig, ConfigProblem>> => {
  const parsed = parseToml(await Bun.file(join(root, REPO_CONFIG_FILE)).text());
  const config = parsed.ok ? decodeRepoConfig(parsed.value) : parsed;
  return config.ok
    ? config
    : err({ kind: "invalid-config", issues: config.error });
};

export const readRepoLock = async (
  layout: RepoLayout,
): Promise<Result<RepoLock, ConfigProblem>> => {
  const file = Bun.file(layout.lockFile);
  if (!(await file.exists())) {
    return ok({ skills: {} });
  }
  const parsed = parseToml(await file.text());
  const lock = parsed.ok ? decodeLock(parsed.value) : parsed;
  return lock.ok ? lock : err({ kind: "invalid-config", issues: lock.error });
};

export const writeRepoLock = async (
  layout: RepoLayout,
  lock: RepoLock,
): Promise<void> => {
  await mkdir(dirname(layout.lockFile), { recursive: true });
  await Bun.write(layout.lockFile, encodeLock(lock));
};

export const repoFiles: RepoFiles = {
  findRoot: findRepoRoot,
  readConfig: readRepoConfig,
  readLock: readRepoLock,
  writeLock: writeRepoLock,
};
