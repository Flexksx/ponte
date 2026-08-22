import { describe, it, expect } from "bun:test";
import { join } from "node:path";
import { readlink } from "node:fs/promises";
import { newHarness } from "./harness";

const isWindows = () => process.platform === "win32";

describe("subagent sync", () => {
  // A local subagent source is a directory of agent files; each file must
  // appear, flattened, inside every enabled vendor's agents directory after
  // sync.
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

  // Subagent files must be symlinks into the store, not copies, so agents
  // cannot modify them.
  it("symlinks subagent files from the store", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const subagentsDir = h.fixtureDir("subagents");
    await appendConfigWithSubagent(h, "claude", subagentsDir);

    await h.mustRun("sync");

    await h.assertIsStoreSymlink(h.vendorAgentPath("claude-code", "code-investigator.md"));
    await h.close();
  });

  // Adding a subagent changes the store generation: the instruction symlink
  // moves to a new generation that also contains the subagent files.
  it("creates a new generation when a subagent is added", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sync");

    const firstTarget = await readlink(h.vendorPaths()["claude-code"]);

    const subagentsDir = h.fixtureDir("subagents");
    await appendConfigWithSubagent(h, "claude", subagentsDir);
    await h.mustRun("sync");

    const secondTarget = await readlink(h.vendorPaths()["claude-code"]);

    expect(secondTarget).not.toBe(firstTarget);
    expect(await h.readFileText(h.vendorAgentPath("claude-code", "fullstack-agent.md"))).toContain(
      "fullstack",
    );
    await h.close();
  });

  // The instruction file must round-trip from an absolute system_prompt_file
  // path outside ~/.config/ponte, so a config repo can own the prompt directly.
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

async function appendConfigWithSubagent(
  h: any,
  name: string,
  sourceDirPath: string,
): Promise<void> {
  const cfg = await h.readFileText(h.configPath("config.toml"));
  const entry = `\n[subagents.${name}]\nsource = ${JSON.stringify(sourceDirPath)}\n`;
  await h.writeFile(h.configPath("config.toml"), cfg + entry);
}