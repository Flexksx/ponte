import { describe, it, expect } from "bun:test";
import { newHarness } from "./harness";

const addConfigTable = async (h: any, key: string, name: string, source: string) => {
  const cfg = await h.readFileText(h.configPath("config.toml"));
  await h.writeFile(h.configPath("config.toml"), `${cfg}
[${key}.${name}]
source = "${source}"
`);
};

describe("skills", () => {
  it("lists declared skills", async () => {
    const h = await newHarness();
    await h.bootstrap();
    const fixture = h.fixturePath("simple_skill");
    await addConfigTable(h, "skills", "simple-skill", fixture);
    const { stdout } = await h.mustRun("skills");
    for (const want of ["NAME", "simple-skill", "local", fixture]) {
      expect(stdout).toContain(want);
    }
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