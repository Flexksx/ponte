import { createHash } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { $ } from "bun";
import { MissingGitRefError, type SkillSource } from "../domain/source";

const CLONE_DIRECTORY_LENGTH = 16;

const cloneDirectoryName = (url: string, ref: string): string =>
  createHash("sha256").update(`${url}\n${ref}`).digest("hex").slice(0, CLONE_DIRECTORY_LENGTH);

const runGit = async (args: string[], cwd?: string): Promise<void> => {
  const shell = $`git ${args}`;
  const result = await (cwd ? shell.cwd(cwd) : shell).quiet();
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.toString().trim()}`);
  }
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

export const resolveSource = async (source: SkillSource, cacheDir: string): Promise<string> => {
  if (source.type === "local") {
    const info = await stat(source.path);
    if (!info.isDirectory()) {
      throw new Error(`skill source is not a directory: ${source.path}`);
    }
    return source.path;
  }
  if (!source.ref) throw new MissingGitRefError(source.url);
  const repo = join(cacheDir, cloneDirectoryName(source.url, source.ref));
  await ensureCloned(repo, source.url);
  await runGit(["checkout", source.ref], repo);
  return source.subdir ? join(repo, source.subdir) : repo;
};
