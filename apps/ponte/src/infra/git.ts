import { createHash } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  err,
  ok,
  type PontePaths,
  type ResolvedSource,
  type Result,
  type SkillSource,
  type SourceProblem,
  type Sources,
  type Warn,
} from "@ponte/core";
import { $ } from "bun";

const CLONE_DIRECTORY_LENGTH = 16;
const GIT_ATTEMPTS = 4;
const GIT_RETRY_BASE_MS = 500;
const TRANSIENT_GIT_ERRORS: readonly RegExp[] = [
  /could not resolve host/i,
  /couldn't resolve host/i,
  /connection (reset|timed out|refused|closed)/i,
  /operation timed out/i,
  /timed out after/i,
  /broken pipe/i,
  /early eof/i,
  /unexpected disconnect/i,
  /remote end hung up/i,
  /rpc failed/i,
  /the requested url returned error: 5\d\d/i,
  /the requested url returned error: 429/i,
  /remote error: internal server error/i,
  /(gnutls_handshake|ssl_read|ssl_error_syscall|tls connection)/i,
  /kex_exchange_identification/i,
  /network is unreachable/i,
  /temporary failure in name resolution/i,
  /unable to access .*: (failed|error|empty reply)/i,
];

const REPO_COMMITS = new Map<string, Promise<string>>();

const cloneDirectoryName = (url: string, ref: string): string =>
  createHash("sha256")
    .update(`${url}\n${ref}`)
    .digest("hex")
    .slice(0, CLONE_DIRECTORY_LENGTH);

export const isTransientGitError = (stderr: string): boolean =>
  TRANSIENT_GIT_ERRORS.some(pattern => pattern.test(stderr));

const retryDelay = (attempt: number): number =>
  GIT_RETRY_BASE_MS * 2 ** (attempt - 1) * (1 + Math.random());

const runGit = async (
  args: string[],
  warn: Warn,
  cwd?: string,
): Promise<string> => {
  const command = `git ${args.join(" ")}`;
  for (let attempt = 1; ; attempt += 1) {
    const shell = $`git ${args}`.nothrow();
    const result = await (cwd ? shell.cwd(cwd) : shell).quiet();
    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }
    const stderr = result.stderr.toString().trim();
    if (attempt >= GIT_ATTEMPTS || !isTransientGitError(stderr)) {
      throw new Error(`${command} failed: ${stderr}`);
    }
    warn(
      `${command} failed (attempt ${attempt}/${GIT_ATTEMPTS}), retrying: ${stderr.split("\n").pop()}`,
    );
    await sleep(retryDelay(attempt));
  }
};

const isCloned = async (repoPath: string): Promise<boolean> => {
  try {
    return (await stat(join(repoPath, ".git"))).isDirectory();
  } catch {
    return false;
  }
};

const ensureCloned = async (
  repoPath: string,
  url: string,
  warn: Warn,
): Promise<void> => {
  if (await isCloned(repoPath)) {
    await runGit(["fetch", "origin"], warn, repoPath);
    return;
  }
  await mkdir(dirname(repoPath), { recursive: true });
  await runGit(["clone", "--", url, repoPath], warn);
};

const checkoutRepo = async (
  repo: string,
  url: string,
  ref: string,
  warn: Warn,
): Promise<string> => {
  await ensureCloned(repo, url, warn);
  await runGit(["checkout", ref], warn, repo);
  return runGit(["rev-parse", "HEAD"], warn, repo);
};

const repoCommit = (
  repo: string,
  url: string,
  ref: string,
  warn: Warn,
): Promise<string> => {
  const commit = REPO_COMMITS.get(repo) ?? checkoutRepo(repo, url, ref, warn);
  REPO_COMMITS.set(repo, commit);
  return commit;
};

export const resolveSourceDetails = async (
  source: SkillSource,
  cacheDir: string,
  warn: Warn,
): Promise<Result<ResolvedSource, SourceProblem>> => {
  if (source.type === "local") {
    const info = await stat(source.path);
    return info.isDirectory()
      ? ok({ directory: source.path, commit: null })
      : err({ kind: "source-not-directory", path: source.path });
  }
  if (!source.ref) {
    return err({ kind: "missing-git-ref", url: source.url });
  }
  const repo = join(cacheDir, cloneDirectoryName(source.url, source.ref));
  const commit = await repoCommit(repo, source.url, source.ref, warn);
  return ok({
    directory: source.subdir ? join(repo, source.subdir) : repo,
    commit,
  });
};

export const createSources = (paths: PontePaths, warn: Warn): Sources => ({
  resolve: source => resolveSourceDetails(source, paths.sourceCache, warn),
});
