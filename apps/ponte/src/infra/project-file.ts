import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  type ConfigProblem,
  err,
  ok,
  PROJECT_CONFIG_FILE,
  type ProjectConfig,
  type ProjectFiles,
  type ProjectLayout,
  type ProjectLock,
  type Result,
} from "@ponte/core";
import {
  decodeLock,
  decodeProjectConfig,
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

export const findProjectRoot = async (
  start: string,
): Promise<string | null> => {
  for (const directory of getAncestorDirectories(start)) {
    if (await Bun.file(join(directory, PROJECT_CONFIG_FILE)).exists()) {
      return directory;
    }
  }
  return null;
};

export const readProjectConfig = async (
  root: string,
): Promise<Result<ProjectConfig, ConfigProblem>> => {
  const parsed = parseToml(
    await Bun.file(join(root, PROJECT_CONFIG_FILE)).text(),
  );
  const config = parsed.ok ? decodeProjectConfig(parsed.value) : parsed;
  return config.ok
    ? config
    : err({ kind: "invalid-config", issues: config.error });
};

export const readProjectLock = async (
  layout: ProjectLayout,
): Promise<Result<ProjectLock, ConfigProblem>> => {
  const file = Bun.file(layout.lockFile);
  if (!(await file.exists())) {
    return ok({ skills: {} });
  }
  const parsed = parseToml(await file.text());
  const lock = parsed.ok ? decodeLock(parsed.value) : parsed;
  return lock.ok ? lock : err({ kind: "invalid-config", issues: lock.error });
};

export const writeProjectLock = async (
  layout: ProjectLayout,
  lock: ProjectLock,
): Promise<void> => {
  await mkdir(dirname(layout.lockFile), { recursive: true });
  await Bun.write(layout.lockFile, encodeLock(lock));
};

export const projectFiles: ProjectFiles = {
  findRoot: findProjectRoot,
  readConfig: readProjectConfig,
  readLock: readProjectLock,
  writeLock: writeProjectLock,
};
