import { join, dirname } from "node:path";
import {
  readFile,
  readdir,
  writeFile,
  mkdir,
  stat,
  rm,
  chmod,
  rename,
  readlink,
  cp,
} from "node:fs/promises";
import { symlinkAtomic } from "./sources";
import { hashEntries, computeHash } from "./hash-core";
import { hashFromStorePath } from "./hash-helpers";

export type ResolvedSkill = { readonly name: string; readonly sourceDir: string };
export type ResolvedSubagent = { readonly name: string; readonly sourceDir: string };

export type BuildInput = {
  readonly prompt: string;
  readonly skills: readonly ResolvedSkill[];
  readonly subagents: readonly ResolvedSubagent[];
};

export type Generation = { readonly hash: string; readonly rootPath: string };

export const BUILD_SUFFIX = ".build";

export async function hashDir(dir: string): Promise<string> {
  const rels = (await readdir(dir, { recursive: true })).sort();
  const files: Array<[string, string]> = [];
  for (const rel of rels) {
    const abs = join(dir, rel);
    const info = await stat(abs);
    if (!info.isFile()) continue;
    files.push([rel, await readFile(abs, "utf8")]);
  }
  return hashEntries(files);
}

export async function hashBuildInput(input: BuildInput): Promise<string> {
  const skillHashes: Array<[string, string]> = [];
  for (const s of input.skills) skillHashes.push([s.name, await hashDir(s.sourceDir)]);
  const subagentHashes: Array<[string, string]> = [];
  for (const a of input.subagents) subagentHashes.push([a.name, await hashDir(a.sourceDir)]);
  return computeHash(input.prompt, skillHashes, subagentHashes);
}

const setPermissions = async (dir: string, dirMode: number, fileMode: number): Promise<void> => {
  const rels = ["", ...(await readdir(dir, { recursive: true }))];
  for (const rel of rels) {
    const abs = join(dir, rel);
    const info = await stat(abs);
    await chmod(abs, info.isDirectory() ? dirMode : fileMode);
  }
};

export async function buildGeneration(input: BuildInput, storeDir: string): Promise<Generation> {
  const hash = await hashBuildInput(input);
  const genDir = join(storeDir, hash);
  try {
    await stat(genDir);
    return { hash, rootPath: genDir };
  } catch {
    void 0;
  }

  const tmp = genDir + BUILD_SUFFIX;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });

  await writeFile(join(tmp, "instruction"), input.prompt);
  for (const s of input.skills) await cpDir(s.sourceDir, join(tmp, "skills", s.name));
  for (const a of input.subagents) await cpDir(a.sourceDir, join(tmp, "subagents", a.name));

  await rename(tmp, genDir);
  try {
    await setPermissions(genDir, 0o555, 0o444);
  } catch {
    void 0;
  }
  return { hash, rootPath: genDir };
}

const cpDir = async (src: string, dst: string): Promise<void> => {
  await mkdir(dirname(dst), { recursive: true });
  await cp(src, dst, { recursive: true });
};

async function linkDir(srcDir: string, dstDir: string, flat: boolean): Promise<void> {
  try {
    await stat(srcDir);
  } catch {
    return;
  }
  await mkdir(dstDir, { recursive: true });

  if (!flat) {
    for (const name of await readdir(srcDir)) {
      const srcPath = join(srcDir, name);
      const info = await stat(srcPath);
      if (!info.isDirectory()) continue;
      await symlinkAtomic(srcPath, join(dstDir, name));
    }
    return;
  }

  for (const dirent of await readdir(srcDir, { recursive: true, withFileTypes: true })) {
    if (!dirent.isFile()) continue;
    const parent = dirent.parentPath ?? srcDir;
    await symlinkAtomic(join(parent, dirent.name), join(dstDir, dirent.name));
  }
}

export async function activate(
  gen: Generation,
  instructionPath: string,
  skillsPath: string,
  agentsPath: string,
): Promise<void> {
  await symlinkAtomic(join(gen.rootPath, "instruction"), instructionPath);
  await linkDir(join(gen.rootPath, "skills"), skillsPath, false);
  await linkDir(join(gen.rootPath, "subagents"), agentsPath, true);
}

export async function listGenerations(storeDir: string): Promise<Generation[]> {
  let names: string[];
  try {
    names = await readdir(storeDir);
  } catch {
    return [];
  }
  const gens: Generation[] = [];
  for (const name of names) {
    if (name.endsWith(BUILD_SUFFIX)) continue;
    const info = await stat(join(storeDir, name));
    if (!info.isDirectory()) continue;
    gens.push({ hash: name, rootPath: join(storeDir, name) });
  }
  return gens.sort(byName);
}

const byName = (a: Generation, b: Generation): number => {
  if (a.hash < b.hash) return -1;
  if (a.hash > b.hash) return 1;
  return 0;
};

export async function readActiveHash(
  storeDir: string,
  instructionPath: string,
): Promise<string | null> {
  let target: string;
  try {
    target = await readlink(instructionPath);
  } catch {
    return null;
  }
  return hashFromStorePath(storeDir, target);
}

export function planGc(
  generations: readonly Generation[],
  activeHashes: ReadonlySet<string>,
): { readonly remove: readonly Generation[]; readonly keep: readonly Generation[] } {
  const remove: Generation[] = [];
  const keep: Generation[] = [];
  for (const gen of generations) {
    (activeHashes.has(gen.hash) ? keep : remove).push(gen);
  }
  return { remove, keep };
}

export async function removeGeneration(gen: Generation): Promise<void> {
  try {
    await setPermissions(gen.rootPath, 0o755, 0o644);
  } catch {
    void 0;
  }
  await rm(gen.rootPath, { recursive: true, force: true });
}
