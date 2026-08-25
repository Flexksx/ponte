import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveContent } from "../src/infra/config-file";
import { resolveSource } from "../src/infra/git";

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
