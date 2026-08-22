import { describe, it, expect } from "bun:test";
import { newHarness } from "./harness";
import { readdir } from "node:fs/promises";

const countGenerations = async (h: any): Promise<number> => {
  try {
    const entries = await readdir(h.storePath());
    return entries.filter((e: string) => !e.endsWith(".build")).length;
  } catch {
    return 0;
  }
};

describe("gc", () => {
  it("removes orphaned generations and keeps the active one", async () => {
    const h = await newHarness();
    await h.bootstrap();

    await h.mustRun("sysprompt", "set", "v1");
    await h.mustRun("sync");
    await h.mustRun("sysprompt", "set", "v2");
    await h.mustRun("sync");
    await h.mustRun("sysprompt", "set", "v3");
    await h.mustRun("sync");

    expect(await countGenerations(h)).toBeGreaterThanOrEqual(2);

    const { stdout } = await h.mustRun("gc");
    expect(stdout).toContain("Removed");

    expect(await countGenerations(h)).toBe(1);
    await h.assertFileEquals(h.vendorPaths()["claude-code"], "v3");
    await h.close();
  });

  it("dry run removes nothing", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", "v1");
    await h.mustRun("sync");
    await h.mustRun("sysprompt", "set", "v2");
    await h.mustRun("sync");

    const before = await countGenerations(h);

    const { stdout } = await h.mustRun("gc", "--dry-run");
    expect(stdout).toContain("Would remove");

    expect(await countGenerations(h)).toBe(before);
    await h.close();
  });

  it("reports nothing to remove on a second run", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", "v1");
    await h.mustRun("sync");
    await h.mustRun("gc");

    const { stdout } = await h.mustRun("gc");
    expect(stdout).toContain("Nothing to remove");
    await h.close();
  });
});