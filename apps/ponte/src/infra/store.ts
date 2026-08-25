import { mkdir, readdir, readlink, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BUILD_SUFFIX,
  hashFromStorePath,
  type BuildInput,
  type Generation,
} from "../domain/generation";
import { computeHash } from "../domain/hashing";
import type { VendorLayout } from "../domain/vendor";
import { copyDirectory, hashDir, setPermissions, symlinkAtomic } from "./filesystem";

const READ_ONLY_DIRECTORY = 0o555;
const READ_ONLY_FILE = 0o444;
const WRITABLE_DIRECTORY = 0o755;
const WRITABLE_FILE = 0o644;

export const hashBuildInput = async (input: BuildInput): Promise<string> => {
  const skills: Array<[string, string]> = [];
  for (const skill of input.skills) skills.push([skill.name, await hashDir(skill.sourceDir)]);
  const subagents: Array<[string, string]> = [];
  for (const subagent of input.subagents) {
    subagents.push([subagent.name, await hashDir(subagent.sourceDir)]);
  }
  return computeHash(input.prompt, skills, subagents);
};

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

export const buildGeneration = async (input: BuildInput, storeDir: string): Promise<Generation> => {
  const hash = await hashBuildInput(input);
  const rootPath = join(storeDir, hash);
  if (await exists(rootPath)) return { hash, rootPath };

  const staging = rootPath + BUILD_SUFFIX;
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  await writeFile(join(staging, "instruction"), input.prompt);
  for (const skill of input.skills) {
    await copyDirectory(skill.sourceDir, join(staging, "skills", skill.name));
  }
  for (const subagent of input.subagents) {
    await copyDirectory(subagent.sourceDir, join(staging, "subagents", subagent.name));
  }
  await rename(staging, rootPath);
  try {
    await setPermissions(rootPath, READ_ONLY_DIRECTORY, READ_ONLY_FILE);
  } catch {
    void 0;
  }
  return { hash, rootPath };
};

const linkSubdirectories = async (sourceDir: string, targetDir: string): Promise<void> => {
  for (const name of await readdir(sourceDir)) {
    const path = join(sourceDir, name);
    const info = await stat(path);
    if (!info.isDirectory()) continue;
    await symlinkAtomic(path, join(targetDir, name));
  }
};

const linkFilesFlat = async (sourceDir: string, targetDir: string): Promise<void> => {
  for (const entry of await readdir(sourceDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    await symlinkAtomic(
      join(entry.parentPath ?? sourceDir, entry.name),
      join(targetDir, entry.name),
    );
  }
};

export const activate = async (generation: Generation, layout: VendorLayout): Promise<void> => {
  await symlinkAtomic(join(generation.rootPath, "instruction"), layout.instruction);
  const skillsDir = join(generation.rootPath, "skills");
  if (await exists(skillsDir)) {
    await mkdir(layout.skills, { recursive: true });
    await linkSubdirectories(skillsDir, layout.skills);
  }
  const subagentsDir = join(generation.rootPath, "subagents");
  if (await exists(subagentsDir)) {
    await mkdir(layout.agents, { recursive: true });
    await linkFilesFlat(subagentsDir, layout.agents);
  }
};

const byHash = (a: Generation, b: Generation): number =>
  a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0;

export const listGenerations = async (storeDir: string): Promise<Generation[]> => {
  let names: string[];
  try {
    names = await readdir(storeDir);
  } catch {
    return [];
  }
  const generations: Generation[] = [];
  for (const name of names) {
    if (name.endsWith(BUILD_SUFFIX)) continue;
    const rootPath = join(storeDir, name);
    const info = await stat(rootPath);
    if (!info.isDirectory()) continue;
    generations.push({ hash: name, rootPath });
  }
  return generations.sort(byHash);
};

export const readActiveHash = async (
  storeDir: string,
  instructionPath: string,
): Promise<string | null> => {
  try {
    return hashFromStorePath(storeDir, await readlink(instructionPath));
  } catch {
    return null;
  }
};

export const removeGeneration = async (generation: Generation): Promise<void> => {
  try {
    await setPermissions(generation.rootPath, WRITABLE_DIRECTORY, WRITABLE_FILE);
  } catch {
    void 0;
  }
  await rm(generation.rootPath, { recursive: true, force: true });
};
