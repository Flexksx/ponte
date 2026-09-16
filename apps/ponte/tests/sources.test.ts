import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveContent } from "../src/infra/config-file";
import { isTransientGitError, resolveSource } from "../src/infra/git";

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
