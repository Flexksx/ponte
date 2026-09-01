import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const GIT_DIRECTORY = ".git";

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

export const directoryExists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
};

export const writeText = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
};

export const listFiles = async (directory: string): Promise<string[]> => {
  const names = await readdir(directory, { recursive: true });
  const files: string[] = [];
  for (const name of names) {
    if ((await stat(join(directory, name))).isFile()) files.push(name);
  }
  return files.sort();
};

export const removeDirectory = async (path: string): Promise<void> => {
  await rm(path, { recursive: true, force: true });
};

export const copyDirectoryWithoutGit = async (from: string, to: string): Promise<void> => {
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  await rm(join(to, GIT_DIRECTORY), { recursive: true, force: true });
};

const treeFiles = async (root: string, inside: string): Promise<string[]> => {
  const entries = await readdir(join(root, inside), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === GIT_DIRECTORY) continue;
    const path = inside === "" ? entry.name : join(inside, entry.name);
    if (entry.isDirectory()) files.push(...(await treeFiles(root, path)));
    else files.push(path);
  }
  return files;
};

const bytesDiffer = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length !== right.length || left.some((byte, index) => byte !== right[index]);

const filesDiffer = async (left: string, right: string): Promise<boolean> =>
  bytesDiffer(await Bun.file(left).bytes(), await Bun.file(right).bytes());

export const directoriesDiffer = async (left: string, right: string): Promise<boolean> => {
  const leftFiles = (await treeFiles(left, "")).sort();
  const rightFiles = (await treeFiles(right, "")).sort();
  if (leftFiles.join("\n") !== rightFiles.join("\n")) return true;
  for (const name of leftFiles) {
    if (await filesDiffer(join(left, name), join(right, name))) return true;
  }
  return false;
};
