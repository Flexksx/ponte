import { describe, expect, it } from "bun:test";
import { newHarness, sourceEntry } from "./harness";

describe("skills", () => {
  it("lists a local skill with the name from SKILL.md", async () => {
    const h = await newHarness();
    await h.bootstrap();
    const fixture = h.fixturePath("simple_skill");
    await h.appendConfig(sourceEntry("skills", fixture));
    const { stdout } = await h.mustRun("skills");
    for (const want of ["NAME", "simple-skill", "local", fixture]) {
      expect(stdout).toContain(want);
    }
    await h.close();
  });

  it("leaves the name blank for a git skill it has not cloned", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.appendConfig(sourceEntry("skills", "https://x/y", "abc123"));
    const { stdout } = await h.mustRun("skills");
    expect(stdout).toContain("git");
    expect(stdout).toContain("https://x/y@abc123");
    expect(stdout).toContain("—");
    await h.close();
  });

  it("reports empty state when none declared", async () => {
    const h = await newHarness();
    await h.bootstrap();
    const { stdout } = await h.mustRun("skills");
    expect(stdout).toContain("No skills configured.");
    await h.close();
  });
});

describe("subagents", () => {
  it("reports empty when none declared", async () => {
    const h = await newHarness();
    await h.bootstrap();
    const { stdout } = await h.mustRun("subagents");
    expect(stdout).toContain("No subagents configured.");
    await h.close();
  });

  it("lists a declared local subagent source with no name column", async () => {
    const h = await newHarness();
    await h.bootstrap();
    const fixtureDir = h.fixtureDir("subagents");
    await h.appendConfig(sourceEntry("subagents", fixtureDir));
    const { stdout } = await h.mustRun("subagents");
    expect(stdout).toContain("local");
    expect(stdout).toContain(fixtureDir);
    expect(stdout).not.toContain("NAME");
    await h.close();
  });
});
