import { lstat, mkdir, readdir, readlink, rm, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Link, VendorPlan } from "../domain/link";

const symlinkTarget = async (path: string): Promise<string | null> => {
  try {
    const info = await lstat(path);
    return info.isSymbolicLink() ? await readlink(path) : null;
  } catch {
    return null;
  }
};

const writeSymlink = async (link: Link): Promise<void> => {
  if ((await symlinkTarget(link.path)) === link.target) return;
  await mkdir(dirname(link.path), { recursive: true });
  await rm(link.path, { force: true });
  await symlink(link.target, link.path);
};

const symlinksIn = async (directory: string): Promise<Map<string, string>> => {
  const found = new Map<string, string>();
  let names: string[];
  try {
    names = await readdir(directory);
  } catch {
    return found;
  }
  for (const name of names) {
    const path = join(directory, name);
    const target = await symlinkTarget(path);
    if (target !== null) found.set(path, target);
  }
  return found;
};

export const readSymlinks = async (plan: VendorPlan): Promise<Map<string, string>> => {
  const links = new Map<string, string>();
  for (const link of plan.links) {
    const target = await symlinkTarget(link.path);
    if (target !== null) links.set(link.path, target);
  }
  for (const directory of plan.ownedDirectories) {
    for (const [path, target] of await symlinksIn(directory)) links.set(path, target);
  }
  return links;
};

export const applyPlan = async (plan: VendorPlan, stale: readonly string[]): Promise<void> => {
  for (const path of stale) await rm(path, { force: true });
  for (const link of plan.links) await writeSymlink(link);
};
