import { describe, expect, it } from "bun:test";
import type { Home } from "./harness";
import { newHarness } from "./harness";

const samplePrompt = "# Sample prompt\n\nDo the right thing.\n";

describe("sync", () => {
  it("writes the prompt to every enabled vendor", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", samplePrompt);
    await h.mustRun("sync");

    for (const [, path] of Object.entries(h.vendorPaths())) {
      await h.assertFileEquals(path, samplePrompt);
    }
    await h.close();
  });

  it("only links named vendors with -a", async () => {
    const h = await newHarness();
    await h.mustRun("sync", "-a", "claude-code,antigravity-cli");

    const paths = h.vendorPaths();
    await h.assertSymlinkTo(paths["claude-code"], h.configPath("AGENTS.md"));
    await h.assertSymlinkTo(paths["antigravity-cli"], h.configPath("AGENTS.md"));
    await h.assertMissing(paths.codex);
    await h.assertMissing(paths["cursor-agent"]);
    await h.close();
  });

  it("accepts repeated -a flags", async () => {
    const h = await newHarness();
    await h.mustRun("sync", "-a", "claude-code", "-a", "codex");

    const paths = h.vendorPaths();
    await h.assertSymlinkTo(paths["claude-code"], h.configPath("AGENTS.md"));
    await h.assertSymlinkTo(paths.codex, h.configPath("AGENTS.md"));
    await h.assertMissing(paths["antigravity-cli"]);
    await h.assertMissing(paths["cursor-agent"]);
    await h.close();
  });

  it("errors on an unknown agent", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", samplePrompt);

    const { stderr, exitCode } = await h.run("sync", "-a", "definitely-not-real");
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("definitely-not-real");
    await h.close();
  });

  it("applies -g inline override without changing the stored prompt", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", samplePrompt);

    const override = "ephemeral override content";
    await h.mustRun("sync", "-g", override);

    for (const [, path] of Object.entries(h.vendorPaths())) {
      await h.assertFileEquals(path, override);
    }
    await h.assertFileEquals(h.configPath("AGENTS.md"), samplePrompt);
    await h.close();
  });

  it("reads -g <file> from a file when it exists", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", "stored content");

    const fixture = h.fixturePath("unicode_prompt.md");
    const want = await h.readFileText(fixture);

    await h.mustRun("sync", "-g", fixture);

    for (const [, path] of Object.entries(h.vendorPaths())) {
      await h.assertFileEquals(path, want);
    }
    await h.close();
  });

  it("skips a disabled vendor", async () => {
    const h = await newHarness();
    await h.mustRun("sync", "-a", "claude-code");

    const cfg = await h.readFileText(h.configPath("config.toml"));
    await h.writeFile(
      h.configPath("config.toml"),
      cfg.replace("[vendors.codex]\nenabled = true", "[vendors.codex]\nenabled = false"),
    );

    await h.mustRun("sync");

    const paths = h.vendorPaths();
    await h.assertSymlinkTo(paths["claude-code"], h.configPath("AGENTS.md"));
    await h.assertSymlinkTo(paths["antigravity-cli"], h.configPath("AGENTS.md"));
    await h.assertMissing(paths.codex);
    await h.close();
  });

  it("runs a dry run without creating a link", async () => {
    const h = await newHarness();
    await h.mustRun("sync", "-a", "claude-code");

    const { stdout } = await h.mustRun("sync", "--dry-run", "-a", "claude-code,codex");
    expect(stdout).toContain("Dry run");

    await h.assertMissing(h.vendorPaths().codex);
    await h.close();
  });

  it("is idempotent when inputs are unchanged", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", samplePrompt);
    await h.mustRun("sync");

    const first = await snapshotVendorFiles(h);
    await h.mustRun("sync");
    const second = await snapshotVendorFiles(h);

    for (const [k, v] of Object.entries(first)) {
      expect(second[k]).toBe(v);
    }
    await h.close();
  });
});

const snapshotVendorFiles = async (h: Home): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const [k, path] of Object.entries(h.vendorPaths())) {
    out[k] = await h.readFileText(path);
  }
  return out;
};
