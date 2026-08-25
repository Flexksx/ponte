import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import type { Home } from "./harness";
import { newHarness } from "./harness";

const isWindows = () => process.platform === "win32";

describe("subagent sync", () => {
  it("flattens local subagent files into every vendor agents dir", async () => {
    if (isWindows()) return; // symlink assertions require Unix
    const h = await newHarness();
    await h.bootstrap();

    const subagentsDir = h.fixtureDir("subagents");
    await appendConfigWithSubagent(h, "claude", subagentsDir);

    await h.mustRun("sync");

    for (const [, agentsDir] of Object.entries(h.vendorAgentsDirs())) {
      for (const agentFile of ["code-investigator.md", "fullstack-agent.md"]) {
        const name = agentFile.slice(0, -".md".length);
        const got = await h.readFileText(join(agentsDir as string, agentFile));
        expect(got).toContain(name);
      }
    }
    await h.close();
  });

  it("symlinks each subagent file to its source", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const subagentsDir = h.fixtureDir("subagents");
    await appendConfigWithSubagent(h, "claude", subagentsDir);

    await h.mustRun("sync");

    await h.assertSymlinkTo(
      h.vendorAgentPath("claude-code", "code-investigator.md"),
      join(subagentsDir, "code-investigator.md"),
    );
    await h.close();
  });

  it("links a subagent added after the first sync", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sync");

    const subagentsDir = h.fixtureDir("subagents");
    await appendConfigWithSubagent(h, "claude", subagentsDir);
    await h.mustRun("sync");
    expect(await h.readFileText(h.vendorAgentPath("claude-code", "fullstack-agent.md"))).toContain(
      "fullstack",
    );
    await h.close();
  });

  it("reads the prompt from an absolute path outside the config dir", async () => {
    const h = await newHarness();
    await h.mustRun("sync"); // bootstrap

    const external = join(h.home, "repo", "AGENTS.md");
    const want = "# external prompt\n\nfrom the config repo\n";
    await h.writeFile(external, want);

    let cfg = await h.readFileText(h.configPath("config.toml"));
    cfg = cfg.replace(
      `system_prompt_file = "AGENTS.md"`,
      `system_prompt_file = ${JSON.stringify(external)}`,
    );
    await h.writeFile(h.configPath("config.toml"), cfg);

    await h.mustRun("sync");

    for (const [, path] of Object.entries(h.vendorPaths())) {
      await h.assertFileEquals(path, want);
    }
    await h.close();
  });
});

const appendConfigWithSubagent = async (
  h: Home,
  name: string,
  sourceDirPath: string,
): Promise<void> => {
  const cfg = await h.readFileText(h.configPath("config.toml"));
  const entry = `\n[subagents.${name}]\nsource = ${JSON.stringify(sourceDirPath)}\n`;
  await h.writeFile(h.configPath("config.toml"), cfg + entry);
};
