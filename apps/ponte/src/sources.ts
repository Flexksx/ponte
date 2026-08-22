import { join, dirname } from "node:path";
import { mkdir, symlink } from "node:fs/promises";
import { $ } from "bun";
import { sha256Hex } from "./hash-helpers";

export type SkillSource =
  | { readonly type: "local"; readonly path: string }
  | { readonly type: "git"; readonly url: string; readonly ref: string; readonly subdir?: string };

const GIT_SOURCE = /^(https?:\/\/|git@|file:\/\/)/;

export const isGitSource = (source: string): boolean => GIT_SOURCE.test(source);

export function parseSource(
  source: string,
  ref = "",
  subdir = "",
): SkillSource {
  return isGitSource(source)
    ? { type: "git", url: source, ref, subdir: subdir || undefined }
    : { type: "local", path: source };
}

// git runs a shell command and throws on a non-zero exit. The message carries
// the command's stderr so the user can act on a failed git operation.
async function runGit(args: string[], cwd?: string): Promise<void> {
  const proc = $`git ${args}`;
  const cmd = cwd ? proc.cwd(cwd) : proc;
  const res = await cmd.quiet();
  if (res.exitCode !== 0) {
    const stderr = res.stderr.toString().trim();
    throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  }
}

async function ensureCloned(repoPath: string, url: string): Promise<void> {
  const gitDir = join(repoPath, ".git");
  try {
    const { stat } = await import("node:fs/promises");
    await stat(gitDir);
    await runGit(["fetch", "origin"], repoPath);
    return;
  } catch {
    // Not cloned yet: fetch failed or stat failed. Clone from scratch.
  }
  await mkdir(dirname(repoPath), { recursive: true });
  await runGit(["clone", "--", url, repoPath]);
}

export async function resolveSource(
  source: SkillSource,
  cacheDir: string,
): Promise<string> {
  switch (source.type) {
    case "local": {
      const { stat } = await import("node:fs/promises");
      const info = await stat(source.path);
      if (!info.isDirectory()) {
        throw new Error(`skill source is not a directory: ${source.path}`);
      }
      return source.path;
    }
    case "git": {
      if (!source.ref) {
        throw new Error(`git source ${source.url} needs a ref`);
      }
      const repo = join(cacheDir, sha256Hex(source.url).slice(0, 16));
      await ensureCloned(repo, source.url);
      await runGit(["checkout", source.ref], repo);
      return source.subdir ? join(repo, source.subdir) : repo;
    }
  }
}

// symlinkAtomic points link at target, replacing an existing link unless it
// already points there. It is idempotent, which is what keeps re-sync cheap.
export async function symlinkAtomic(target: string, link: string): Promise<void> {
  const { readlink, mkdir: mk } = await import("node:fs/promises");
  await mk(dirname(link), { recursive: true });
  try {
    if ((await readlink(link)) === target) return;
  } catch {
    // link absent; fall through to create it
  }
  const { rm } = await import("node:fs/promises");
  await rm(link, { force: true });
  await symlink(target, link);
}