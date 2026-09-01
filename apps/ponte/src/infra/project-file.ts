import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  ancestorDirectories,
  normalizeProjectConfig,
  PROJECT_CONFIG_FILE,
  type ProjectConfig,
  type ProjectLayout,
  type ProjectLock,
} from "../domain/project";
import { decodeLock, decodeProjectConfig, encodeLock } from "./config-codec";

export const findProjectRoot = async (start: string): Promise<string | null> => {
  for (const directory of ancestorDirectories(start)) {
    if (await Bun.file(join(directory, PROJECT_CONFIG_FILE)).exists()) return directory;
  }
  return null;
};

export const readProjectConfig = async (root: string): Promise<ProjectConfig> => {
  const text = await Bun.file(join(root, PROJECT_CONFIG_FILE)).text();
  return normalizeProjectConfig(decodeProjectConfig(Bun.TOML.parse(text)), root);
};

export const readProjectLock = async (layout: ProjectLayout): Promise<ProjectLock> => {
  const file = Bun.file(layout.lockFile);
  if (!(await file.exists())) return { skills: {} };
  return decodeLock(Bun.TOML.parse(await file.text()));
};

export const writeProjectLock = async (layout: ProjectLayout, lock: ProjectLock): Promise<void> => {
  await mkdir(dirname(layout.lockFile), { recursive: true });
  await Bun.write(layout.lockFile, encodeLock(lock));
};
