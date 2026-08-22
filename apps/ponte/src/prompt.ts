import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promptFilePath } from "./config";

export async function readPrompt(filename: string): Promise<string | null> {
  const file = Bun.file(promptFilePath(filename));
  if (!(await file.exists())) return null;
  return file.text();
}

export async function writePrompt(filename: string, content: string): Promise<void> {
  const path = promptFilePath(filename);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

export async function resolveContent(arg: string): Promise<string> {
  const file = Bun.file(arg);
  if (await file.exists()) return file.text();
  return arg;
}
