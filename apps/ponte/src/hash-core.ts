import { createHash } from "node:crypto";
import { sha256Hex } from "./hash-helpers";

export class ConfigError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(problems.join("\n"));
    this.problems = problems;
  }
}

export function hashEntries(files: ReadonlyArray<readonly [rel: string, content: string]>): string {
  const body = files.map(([rel, content]) => `${rel}:${sha256Hex(content)}`).join("\n") + "\n";
  return sha256Hex(body);
}

export function computeHash(
  prompt: string,
  skills: ReadonlyArray<readonly [name: string, dirHash: string]>,
  subagents: ReadonlyArray<readonly [name: string, dirHash: string]>,
): string {
  const byName = (a: readonly [string, string], b: readonly [string, string]) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  const lines = [
    `systemprompt:${sha256Hex(prompt)}`,
    ...[...skills].sort(byName).map(([name, h]) => `skill:${name}:${h}`),
    ...[...subagents].sort(byName).map(([name, h]) => `subagent:${name}:${h}`),
  ];
  return sha256Hex(lines.join("\n") + "\n").slice(0, 32);
}
