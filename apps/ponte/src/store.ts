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

// ---- hashing -----------------------------------------------------------------

// hashDir walks a directory and reproduces Go's hashDir over its file
// contents. Entries are sorted lexically so the result matches Go's WalkDir
// ordering regardless of filesystem enumeration order.
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

// hashBuildInput computes the generation hash for a build input, reading the
// disk to hash each skill and subagent directory.
export async function hashBuildInput(input: BuildInput): Promise<string> {
  const skillHashes: Array<[string, string]> = [];
  for (const s of input.skills) {
    skillHashes.push([s.name, await hashDir(s.sourceDir)]);
  }
  const subagentHashes: Array<[string, string]> = [];
  for (const a of input.subagents) {
    subagentHashes.push([a.name, await hashDir(a.sourceDir)]);
  }
  return computeHash(input.prompt, skillHashes, subagentHashes);
}

// ---- building (effect, throws) ------------------------------------------------

const makeReadOnly = async (dir: string): Promise<void> => {
  try {
    const rels = [""];
    const entries = await readdir(dir, { recursive: true });
    rels.push(...entries);
    for (const rel of rels) {
      const abs = join(dir, rel);
      const info = await stat(abs);
      await chmod(abs, info.isDirectory() ? 0o555 : 0o444);
    }
  } catch {
    // Best-effort: some filesystems reject chmod. Not fatal.
  }
};

export async function buildGeneration(
  input: BuildInput,
  storeDir: string,
): Promise<Generation> {
  const hash = await hashBuildInput(input);
  const genDir = join(storeDir, hash);
  try {
    await stat(genDir);
    return { hash, rootPath: genDir };
  } catch {
    // genDir absent; build it below.
  }

  const tmp = genDir + BUILD_SUFFIX;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });

  await writeFile(join(tmp, "instruction"), input.prompt);
  if (input.skills.length > 0) {
    for (const s of input.skills) {
      await cpDir(s.sourceDir, join(tmp, "skills", s.name));
    }
  }
  if (input.subagents.length > 0) {
    for (const a of input.subagents) {
      await cpDir(a.sourceDir, join(tmp, "subagents", a.name));
    }
  }

  await rename(tmp, genDir);
  await makeReadOnly(genDir);
  return { hash, rootPath: genDir };
}

const cpDir = async (src: string, dst: string): Promise<void> => {
  const { cp } = await import("node:fs/promises");
  await mkdir(dirname(dst), { recursive: true });
  await cp(src, dst, { recursive: true });
};

// ---- activation (effect, throws) --------------------------------------------

// linkDir symlinks store content into a vendor's directory. With flat=true,
// every file in the store tree is linked by basename, dropping the grouping;
// this matches how vendors expect a flat set of agent files.
async function linkDir(srcDir: string, dstDir: string, flat: boolean): Promise<void> {
  const { mkdir: mk } = await import("node:fs/promises");
  try {
    await stat(srcDir);
  } catch {
    return; // no skills/subagents in this generation
  }
  await mk(dstDir, { recursive: true });

  if (!flat) {
    const names = await readdir(srcDir);
    for (const name of names) {
      const srcPath = join(srcDir, name);
      const info = await stat(srcPath);
      if (!info.isDirectory()) continue;
      await symlinkAtomic(srcPath, join(dstDir, name));
    }
    return;
  }

  // Flat mode: recurse and link every file to dstDir/<basename>.
  const { readdir: rd } = await import("node:fs/promises");
  const all = await rd(srcDir, { recursive: true, withFileTypes: true });
  for (const dirent of all) {
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

// ---- listing and gc (effect, throws) ------------------------------------------

export async function listGenerations(storeDir: string): Promise<Generation[]> {
  let names: string[];
  try {
    names = await readdir(storeDir);
  } catch {
    return []; // missing store is not an error
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

const byName = (a: Generation, b: Generation) => {
  if (a.hash < b.hash) return -1;
  if (a.hash > b.hash) return 1;
  return 0;
};

// readActiveHash returns the hash a vendor's instruction symlink points at, or
// null when the path is absent, not a symlink, or not inside the store.
export async function readActiveHash(
  storeDir: string,
  instructionPath: string,
): Promise<string | null> {
  let target: string;
  try {
    target = await readlink(instructionPath);
  } catch {
    return null; // absent or not a symlink: not activated
  }
  return hashFromStorePath(storeDir, target);
}

// planGc splits generations into those to remove and those to keep, given the
// set of hashes actively referenced by vendors. Pure and unit-testable.
export function planGc(
  generations: readonly Generation[],
  activeHashes: ReadonlySet<string>,
): { readonly remove: readonly Generation[]; readonly keep: readonly Generation[] } {
  const remove: Generation[] = [];
  const keep: Generation[] = [];
  for (const gen of generations) {
    if (activeHashes.has(gen.hash)) keep.push(gen);
    else remove.push(gen);
  }
  return { remove, keep };
}

// collectActiveHashes resolves every vendor's active generation hash. All
// vendors are considered, not only enabled ones, because a disabled vendor's
// symlink still pins a generation that must not be collected.
export async function collectActiveHashes(
  layouts: Record<string, { readonly instruction: string }>,
  pf: { readonly storeDir: string },
): Promise<Set<string>> {
  const hashes = new Set<string>();
  for (const layout of Object.values(layouts)) {
    const hash = await readActiveHash(pf.storeDir, layout.instruction);
    if (hash) hashes.add(hash);
  }
  return hashes;
}

export async function removeGeneration(gen: Generation): Promise<void> {
  // Generations are read-only on build, so restore write permissions first.
  const rels = [""];
  const entries = await readdir(gen.rootPath, { recursive: true });
  rels.push(...entries);
  for (const rel of rels) {
    const abs = join(gen.rootPath, rel);
    const info = await stat(abs);
    await chmod(abs, info.isDirectory() ? 0o755 : 0o644);
  }
  await rm(gen.rootPath, { recursive: true, force: true });
}