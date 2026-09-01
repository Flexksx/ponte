import { createHash } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { $ } from "bun";
import { MissingGitRefError, type SkillSource } from "../domain/source";
import { directoryExists } from "./filesystem";

const CLONE_DIRECTORY_LENGTH = 16;

export type ResolvedSource = { readonly directory: string; readonly commit: string | null };

const cloneDirectoryName = (url: string, ref: string): string =>
  createHash("sha256").update(`${url}\n${ref}`).digest("hex").slice(0, CLONE_DIRECTORY_LENGTH);

const runGit = async (args: string[], cwd?: string): Promise<string> => {
  const shell = $`git ${args}`;
  const result = await (cwd ? shell.cwd(cwd) : shell).quiet();
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.toString().trim()}`);
  }
  return result.stdout.toString().trim();
};

const ensureCloned = async (repoPath: string, url: string): Promise<void> => {
  try {
    await stat(join(repoPath, ".git"));
    await runGit(["fetch", "origin"], repoPath);
  } catch {
    await mkdir(dirname(repoPath), { recursive: true });
    await runGit(["clone", "--", url, repoPath]);
  }
};

export const resolveSourceDetails = async (
  source: SkillSource,
  cacheDir: string,
): Promise<ResolvedSource> => {
  if (source.type === "local") {
    const info = await stat(source.path);
    if (!info.isDirectory()) {
      throw new Error(`skill source is not a directory: ${source.path}`);
    }
    return { directory: source.path, commit: null };
  }
  if (!source.ref) throw new MissingGitRefError(source.url);
  const repo = join(cacheDir, cloneDirectoryName(source.url, source.ref));
  await ensureCloned(repo, source.url);
  await runGit(["checkout", source.ref], repo);
  return {
    directory: source.subdir ? join(repo, source.subdir) : repo,
    commit: await runGit(["rev-parse", "HEAD"], repo),
  };
};

export const resolveSource = async (source: SkillSource, cacheDir: string): Promise<string> =>
  (await resolveSourceDetails(source, cacheDir)).directory;

export const cachedSourceDirectory = async (
  source: SkillSource,
  cacheDir: string,
): Promise<string | null> => {
  if (source.type === "local") {
    return (await directoryExists(source.path)) ? source.path : null;
  }
  if (!source.ref) return null;
  const repo = join(cacheDir, cloneDirectoryName(source.url, source.ref));
  const directory = source.subdir ? join(repo, source.subdir) : repo;
  return (await directoryExists(directory)) ? directory : null;
};
