import { createHash } from "node:crypto";

// ConfigError reports every problem found while decoding config.toml at once,
// rather than stopping at the first one.
export class ConfigError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(problems.join("\n"));
    this.problems = problems;
  }
}

const sha256Hex = (s: string): string =>
  createHash("sha256").update(s).digest("hex");

// hashEntries reproduces Go's hashDir for a directory given as (relative path,
// contents) pairs. The caller supplies the pairs in lexical walk order.
export function hashEntries(
  files: ReadonlyArray<readonly [rel: string, content: string]>,
): string {
  const body =
    files
      .map(([rel, content]) => `${rel}:${sha256Hex(content)}`)
      .join("\n") + "\n";
  return sha256Hex(body);
}

// computeHash reproduces Go's ComputeHash. It receives already-computed
// directory hashes so it stays pure.
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