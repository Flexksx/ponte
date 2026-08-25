import { describe, it, expect } from "bun:test";
import { planGc, type Generation } from "../src/domain/generation";
import { hashDir } from "../src/infra/filesystem";
import { buildGeneration, listGenerations, readActiveHash } from "../src/infra/store";
import { join } from "node:path";
import { mkdtemp, readFile, writeFile, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
const scratchDir = () => mkdtemp(join(tmpdir(), "ponte-store-"));

const emptyInput = (prompt = "p") => ({
  prompt,
  skills: [],
  subagents: [],
});

describe("buildGeneration", () => {
  it("writes the instruction and returns a hash-named dir", async () => {
    const store = await scratchDir();
    const gen = await buildGeneration(emptyInput("hello"), store);
    expect(gen.rootPath).toBe(join(store, gen.hash));
    const content = await readFile(join(gen.rootPath, "instruction"), "utf8");
    expect(content).toBe("hello");
  });

  it("reuses the same generation on identical inputs", async () => {
    const store = await scratchDir();
    const a = await buildGeneration(emptyInput("same"), store);
    const b = await buildGeneration(emptyInput("same"), store);
    expect(a.hash).toBe(b.hash);
    const gens = await listGenerations(store);
    expect(gens.length).toBe(1);
  });

  it("creates a new generation when the prompt changes", async () => {
    const store = await scratchDir();
    const a = await buildGeneration(emptyInput("v1"), store);
    const b = await buildGeneration(emptyInput("v2"), store);
    expect(a.hash).not.toBe(b.hash);
  });

  it("copies skills into the generation", async () => {
    const store = await scratchDir();
    const skillDir = await scratchDir();
    await writeFile(join(skillDir, "SKILL.md"), "skill content");
    const input = { prompt: "p", skills: [{ name: "s", sourceDir: skillDir }], subagents: [] };
    const gen = await buildGeneration(input, store);
    const content = await readFile(join(gen.rootPath, "skills", "s", "SKILL.md"), "utf8");
    expect(content).toBe("skill content");
  });
});

describe("hashDir", () => {
  it("reproduces the Go hashDir over a sorted tree", async () => {
    const dir = await scratchDir();
    await writeFile(join(dir, "b.txt"), "hello");
    await writeFile(join(dir, "a.txt"), "world");
    const got = await hashDir(dir);
    expect(got).toHaveLength(64);
    const again = await hashDir(dir);
    expect(got).toBe(again);
    await writeFile(join(dir, "a.txt"), "changed");
    expect(await hashDir(dir)).not.toBe(got);
  });
});

describe("planGc", () => {
  const gen = (hash: string): Generation => ({ hash, rootPath: `/store/${hash}` });

  it("keeps active, removes orphaned", () => {
    const gens = [gen("a"), gen("b"), gen("c")];
    const { remove, keep } = planGc(gens, new Set(["b"]));
    expect(remove.map(g => g.hash)).toEqual(["a", "c"]);
    expect(keep.map(g => g.hash)).toEqual(["b"]);
  });
});

describe("readActiveHash", () => {
  it("returns null when the path does not exist", async () => {
    const store = await scratchDir();
    const hash = await readActiveHash(store, join(store, "missing"));
    expect(hash).toBeNull();
  });

  it("returns the hash for a symlink inside the store", async () => {
    const store = await scratchDir();
    await mkdir(join(store, "abc123def"));
    const target = join(store, "abc123def", "instruction");
    await writeFile(target, "x");
    const link = join(store, "link");
    await symlink(target, link);
    expect(await readActiveHash(store, link)).toBe("abc123def");
  });

  it("returns null for a symlink outside the store", async () => {
    const store = await scratchDir();
    const outside = await scratchDir();
    await writeFile(join(outside, "instruction"), "x");
    const link = join(store, "link");
    await symlink(join(outside, "instruction"), link);
    expect(await readActiveHash(store, link)).toBeNull();
  });
});
