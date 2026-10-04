import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPontePaths } from "@ponte/core";
import { $ } from "bun";
import { createPromptStore } from "../src/infra/config-file";
import { isTransientGitError, resolveSourceDetails } from "../src/infra/git";

const warnings: string[] = [];

const warn = (message: string): void => {
  warnings.push(message);
};

describe("resolveSourceDetails.local", () => {
  it("resolves an existing directory and rejects non-directories", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ponte-src-"));
    const dir = join(parent, "skill");
    await mkdir(dir);

    const got = await resolveSourceDetails(
      { type: "local", path: dir },
      parent,
      warn,
    );
    expect(got).toEqual({ ok: true, value: { directory: dir, commit: null } });
    const filePath = join(parent, "file.txt");
    await writeFile(filePath, "x");
    const rejected = await resolveSourceDetails(
      { type: "local", path: filePath },
      parent,
      warn,
    );
    expect(rejected).toEqual({
      ok: false,
      error: { kind: "source-not-directory", path: filePath },
    });
  });
});

describe("resolveSourceDetails.missing ref", () => {
  it("reports a git source without a ref as a problem", async () => {
    const rejected = await resolveSourceDetails(
      { type: "git", url: "https://x/y", ref: "" },
      "/unused",
      warn,
    );
    expect(rejected).toEqual({
      ok: false,
      error: { kind: "missing-git-ref", url: "https://x/y" },
    });
  });
});

describe("PromptStore.readFile", () => {
  it("reads a file when the argument names an existing file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ponte-content-"));
    const file = join(dir, "a.md");
    await writeFile(file, "file body");
    const prompts = createPromptStore(buildPontePaths({ home: dir }));
    expect(await prompts.readFile(file)).toBe("file body");
  });
  it("returns null when no file exists there", async () => {
    const prompts = createPromptStore(buildPontePaths({ home: "/unused" }));
    expect(await prompts.readFile("not a real path")).toBeNull();
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
      resolveSourceDetails(source, cache, warn),
      resolveSourceDetails(source, cache, warn),
      resolveSourceDetails(source, cache, warn),
    ]);
    const resolved = results.map(result => (result.ok ? result.value : null));

    expect(new Set(resolved.map(value => value?.directory)).size).toBe(1);
    expect(new Set(resolved.map(value => value?.commit)).size).toBe(1);
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
        warn,
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
