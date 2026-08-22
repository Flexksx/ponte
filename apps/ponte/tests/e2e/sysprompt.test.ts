import { describe, it, expect } from "bun:test";
import { newHarness } from "./harness";

describe("sysprompt", () => {
  it("set writes a literal string", async () => {
    const h = await newHarness();
    await h.mustRun("sync");
    const content = "literal inline content with spaces";
    await h.mustRun("sysprompt", "set", content);
    await h.assertFileEquals(h.configPath("AGENTS.md"), content);
    await h.close();
  });

  it("set reads a file when the argument exists", async () => {
    const h = await newHarness();
    await h.mustRun("sync");
    const fixture = h.fixturePath("simple_prompt.md");
    const want = await h.readFileText(fixture);
    await h.mustRun("sysprompt", "set", fixture);
    await h.assertFileEquals(h.configPath("AGENTS.md"), want);
    await h.close();
  });

  it("set overwrites on a second call", async () => {
    const h = await newHarness();
    await h.mustRun("sync");
    await h.mustRun("sysprompt", "set", "first");
    await h.mustRun("sysprompt", "set", "second");
    await h.assertFileEquals(h.configPath("AGENTS.md"), "second");
    await h.close();
  });

  it("set preserves multi-line file bytes across sync", async () => {
    const h = await newHarness();
    await h.mustRun("sync");
    const fixture = h.fixturePath("unicode_prompt.md");
    const want = await h.readFileText(fixture);
    await h.mustRun("sysprompt", "set", fixture);
    await h.assertFileEquals(h.configPath("AGENTS.md"), want);
    await h.mustRun("sync");
    for (const [, p] of Object.entries(h.vendorPaths())) {
      await h.assertFileEquals(p, want);
    }
    await h.close();
  });

  it("errors when set is called with no argument", async () => {
    const h = await newHarness();
    await h.mustRun("sync");
    const { stderr, exitCode } = await h.run("sysprompt", "set");
    expect(exitCode).not.toBe(0);
    expect(stderr.toLowerCase()).toContain("arg");
    await h.close();
  });

  it("show prints the stored prompt verbatim", async () => {
    const h = await newHarness();
    await h.mustRun("sync");
    const content = "# Sample prompt\n\nDo the right thing.\n";
    await h.mustRun("sysprompt", "set", content);
    const { stdout } = await h.mustRun("sysprompt");
    expect(stdout).toBe(content);
    await h.close();
  });
});