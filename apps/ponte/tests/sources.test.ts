import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { resolveContent } from "../src/infra/config-file";
import {
  isTransientGitError,
  resolveSource,
  resolveSourceDetails,
} from "../src/infra/git";

describe("resolveSource.local", () => {
  it("resolves an existing directory and rejects non-directories", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ponte-src-"));
    const dir = join(parent, "skill");
    await mkdir(dir);

    const got = await resolveSource({ type: "local", path: dir }, parent);
    expect(got).toBe(dir);
    const filePath = join(parent, "file.txt");
    await writeFile(filePath, "x");
    let threw = false;
    try {
      await resolveSource({ type: "local", path: filePath }, parent);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("resolveContent", () => {
  it("reads a file when the argument names an existing file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ponte-content-"));
    const file = join(dir, "a.md");
    await writeFile(file, "file body");
    expect(await resolveContent(file)).toBe("file body");
  });
  it("treats a missing argument as a literal string", async () => {
    expect(await resolveContent("not a real path")).toBe("not a real path");
  });
});

describe("isTransientGitError", () => {
  it("retries network failures that git reports as exit code 128", () => {
    const transient = [
      "fatal: unable to access 'https://github.com/a/b.git/': The requested URL returned error: 503",
      "fatal: unable to access 'https://github.com/a/b.git/': Could not resolve host: github.com",
      "error: RPC failed; curl 56 GnuTLS recv error (-54)\nfatal: early EOF",
      "fatal: the remote end hung up unexpectedly",
      "ssh: connect to host github.com port 22: Connection timed out",
    ];
    for (const stderr of transient) {
      expect(isTransientGitError(stderr)).toBe(true);
    }
  });
  it("does not retry failures that another attempt cannot fix", () => {
    const permanent = [
      "fatal: repository 'https://github.com/a/b.git/' not found",
      "error: pathspec 'v9.9.9' did not match any file(s) known to git",
      "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
      "fatal: not a git repository (or any of the parent directories): .git",
    ];
    for (const stderr of permanent) {
      expect(isTransientGitError(stderr)).toBe(false);
    }
  });
});

describe("resolveSourceDetails.git", () => {
  it("shares one clone between concurrent requests for the same ref", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ponte-clone-"));
    const origin = join(parent, "origin");
    const cache = join(parent, "cache");
    await mkdir(origin);
    await writeFile(join(origin, "SKILL.md"), "---\nname: demo\n---\n");
    await $`git init -q -b main`.cwd(origin).quiet();
    await $`git -c user.email=t@t -c user.name=t add -A`.cwd(origin).quiet();
    await $`git -c user.email=t@t -c user.name=t commit -qm init`
      .cwd(origin)
      .quiet();

    const source = { type: "git", url: origin, ref: "main" } as const;
    const results = await Promise.all([
      resolveSourceDetails(source, cache),
      resolveSourceDetails(source, cache),
      resolveSourceDetails(source, cache),
    ]);

    expect(new Set(results.map(result => result.directory)).size).toBe(1);
    expect(new Set(results.map(result => result.commit)).size).toBe(1);
    expect((await readdir(cache)).length).toBe(1);
  });
});

describe("runGit errors", () => {
  it("reports the command and the git stderr, and does not retry", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ponte-giterr-"));
    const origin = join(parent, "origin");
    await mkdir(origin);
    await writeFile(join(origin, "SKILL.md"), "---\nname: demo\n---\n");
    await $`git init -q -b main`.cwd(origin).quiet();
    await $`git -c user.email=t@t -c user.name=t add -A`.cwd(origin).quiet();
    await $`git -c user.email=t@t -c user.name=t commit -qm init`
      .cwd(origin)
      .quiet();

    const started = Date.now();
    let message = "";
    try {
      await resolveSourceDetails(
        { type: "git", url: origin, ref: "no-such-ref" },
        join(parent, "cache"),
      );
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("git checkout no-such-ref failed");
    expect(message).toContain("no-such-ref");
    expect(message).toContain("pathspec");
    expect(Date.now() - started < 2000).toBe(true);
  });
});
