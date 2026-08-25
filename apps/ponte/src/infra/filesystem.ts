import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile();
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
