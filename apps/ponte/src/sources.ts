import { join, dirname } from "node:path";
import { mkdir, symlink, stat, readlink, rm } from "node:fs/promises";
import { $ } from "bun";
import { sha256Hex } from "./hash-helpers";

export type SkillSource =
  | { readonly type: "local"; readonly path: string }
  | { readonly type: "git"; readonly url: string; readonly ref: string; readonly subdir?: string };

const GIT_SOURCE = /^(https?:\/\/|git@|file:\/\/)/;

export const isGitSource = (source: string): boolean => GIT_SOURCE.test(source);

export function parseSource(source: string, ref = "", subdir = ""): SkillSource {
  return isGitSource(source)
    ? { type: "git", url: source, ref, subdir: subdir || undefined }
    : { type: "local", path: source };
}

async function runGit(args: string[], cwd?: string): Promise<void> {
  const proc = $`git ${args}`;
  const cmd = cwd ? proc.cwd(cwd) : proc;
  const res = await cmd.quiet();
  if (res.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${res.stderr.toString().trim()}`);
  }
}

async function ensureCloned(repoPath: string, url: string): Promise<void> {
  const gitDir = join(repoPath, ".git");
  try {
    await stat(gitDir);
    await runGit(["fetch", "origin"], repoPath);
  } catch {
    await mkdir(dirname(repoPath), { recursive: true });
    await runGit(["clone", "--", url, repoPath]);
  }
}

export async function resolveSource(source: SkillSource, cacheDir: string): Promise<string> {
  switch (source.type) {
    case "local": {
      const info = await stat(source.path);
      if (!info.isDirectory()) {
        throw new Error(`skill source is not a directory: ${source.path}`);
      }
      return source.path;
    }
    case "git": {
      if (!source.ref) throw new Error(`git source ${source.url} needs a ref`);
      const repo = join(cacheDir, sha256Hex(source.url).slice(0, 16));
      await ensureCloned(repo, source.url);
      await runGit(["checkout", source.ref], repo);
      return source.subdir ? join(repo, source.subdir) : repo;
    }
  }
}

export async function symlinkAtomic(target: string, link: string): Promise<void> {
  await mkdir(dirname(link), { recursive: true });
  try {
    if ((await readlink(link)) === target) return;
  } catch {
    void 0;
  }
  await rm(link, { force: true });
  await symlink(target, link);
}
