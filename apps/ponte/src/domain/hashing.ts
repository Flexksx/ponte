import { createHash } from "node:crypto";

export const sha256Hex = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const shortHash = (hash: string): string => (hash.length <= 12 ? hash : hash.slice(0, 12));

export const hashEntries = (
  files: ReadonlyArray<readonly [relativePath: string, content: string]>,
): string =>
  sha256Hex(`${files.map(([rel, content]) => `${rel}:${sha256Hex(content)}`).join("\n")}\n`);

const byName = (a: readonly [string, string], b: readonly [string, string]): number =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;

export const computeHash = (
  prompt: string,
  skills: ReadonlyArray<readonly [name: string, dirHash: string]>,
  subagents: ReadonlyArray<readonly [name: string, dirHash: string]>,
): string => {
  const lines = [
    `systemprompt:${sha256Hex(prompt)}`,
    ...[...skills].sort(byName).map(([name, hash]) => `skill:${name}:${hash}`),
    ...[...subagents].sort(byName).map(([name, hash]) => `subagent:${name}:${hash}`),
  ];
  return sha256Hex(`${lines.join("\n")}\n`).slice(0, 32);
};
