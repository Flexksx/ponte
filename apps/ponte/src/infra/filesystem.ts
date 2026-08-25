import { chmod, cp, mkdir, readdir, readFile, readlink, rm, stat, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { hashEntries } from "../domain/hashing";

export const symlinkAtomic = async (target: string, link: string): Promise<void> => {
  await mkdir(dirname(link), { recursive: true });
  try {
    if ((await readlink(link)) === target) return;
  } catch {
    void 0;
  }
  await rm(link, { force: true });
  await symlink(target, link);
};

export const copyDirectory = async (source: string, destination: string): Promise<void> => {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
};

export const setPermissions = async (
  dir: string,
  directoryMode: number,
  fileMode: number,
): Promise<void> => {
  const relatives = ["", ...(await readdir(dir, { recursive: true }))];
  for (const relative of relatives) {
    const absolute = join(dir, relative);
    const info = await stat(absolute);
    await chmod(absolute, info.isDirectory() ? directoryMode : fileMode);
  }
};

export const hashDir = async (dir: string): Promise<string> => {
  const relatives = (await readdir(dir, { recursive: true })).sort();
  const files: Array<[string, string]> = [];
  for (const relative of relatives) {
    const absolute = join(dir, relative);
    const info = await stat(absolute);
    if (!info.isFile()) continue;
    files.push([relative, await readFile(absolute, "utf8")]);
  }
  return hashEntries(files);
};
