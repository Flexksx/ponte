import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promptFilePath } from "./config";

// readPrompt returns the system prompt contents, or null when the file is
// absent. A bare filename resolves against the config directory; an absolute
// path reads as-is.
export async function readPrompt(filename: string): Promise<string | null> {
  const path = promptFilePath(filename);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  return file.text();
}

export async function writePrompt(filename: string, content: string): Promise<void> {
  const path = promptFilePath(filename);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

// resolveContent reads the argument as a file when it names an existing file,
// otherwise returns the argument verbatim. This is the file-or-literal rule for
// -g and `sysprompt set`.
export async function resolveContent(arg: string): Promise<string> {
  const file = Bun.file(arg);
  if (await file.exists()) return file.text();
  return arg;
}