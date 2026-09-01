import { describe, expect, it } from "bun:test";
import type { Home } from "./harness";
import { newHarness, skillEntry } from "./harness";

const addConfigTable = async (h: Home, key: string, name: string, source: string) => {
  await h.appendConfig(`[${key}.${name}]\nsource = "${source}"\n`);
};

describe("skills", () => {
  it("lists a local skill under its frontmatter name", async () => {
    const h = await newHarness();
    await h.bootstrap();
    const fixture = h.fixturePath("simple_skill");
    await h.appendConfig(skillEntry(fixture));
    const { stdout } = await h.mustRun("skills");
    for (const want of ["NAME", "simple-skill", "local", fixture]) {
      expect(stdout).toContain(want);
    }
    await h.close();
  });

  it("leaves the name unknown for a git source the cache does not hold", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.appendConfig(skillEntry("https://example.invalid/repo", "abc123"));
    const { stdout } = await h.mustRun("skills");
    expect(stdout).toContain("?");
    expect(stdout).toContain("https://example.invalid/repo");
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

  it("lists a declared local subagent", async () => {
    const h = await newHarness();
    await h.bootstrap();
    const fixtureDir = h.fixtureDir("subagents");
    await addConfigTable(h, "subagents", "my-agents", fixtureDir);
    const { stdout } = await h.mustRun("subagents");
    expect(stdout).toContain("my-agents");
    expect(stdout).toContain("local");
    await h.close();
  });
});
