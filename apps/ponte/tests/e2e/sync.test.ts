import { describe, it, expect } from "bun:test";
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

  it("only writes named vendors with -a", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", samplePrompt);

    await h.mustRun("sync", "-a", "claude-code,gemini-cli");

    const paths = h.vendorPaths();
    await h.assertFileEquals(paths["claude-code"], samplePrompt);
    await h.assertFileEquals(paths["gemini-cli"], samplePrompt);
    await h.assertFileEquals(paths["codex"], "");
    await h.assertFileEquals(paths["cursor-agent"], "");
    await h.close();
  });

  it("accepts repeated -a flags", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", samplePrompt);

    await h.mustRun("sync", "-a", "claude-code", "-a", "codex");

    const paths = h.vendorPaths();
    await h.assertFileEquals(paths["claude-code"], samplePrompt);
    await h.assertFileEquals(paths["codex"], samplePrompt);
    await h.assertFileEquals(paths["gemini-cli"], "");
    await h.assertFileEquals(paths["cursor-agent"], "");
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
    await h.mustRun("sync");
    await h.mustRun("sysprompt", "set", samplePrompt);

    const cfg = await h.readFileText(h.configPath("config.toml"));
    const withDisabled = cfg.replace(
      "[vendors.codex]\nenabled = true",
      "[vendors.codex]\nenabled = false",
    );
    await h.writeFile(h.configPath("config.toml"), withDisabled);

    await h.mustRun("sync");

    const paths = h.vendorPaths();
    await h.assertFileEquals(paths["claude-code"], samplePrompt);
    await h.assertFileEquals(paths["gemini-cli"], samplePrompt);
    await h.assertFileEquals(paths["cursor-agent"], samplePrompt);
    await h.assertFileEquals(paths["codex"], "");
    await h.close();
  });

  it("runs a dry run without writing anything", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", "v1");
    await h.mustRun("sync");

    const before = await countGenerations(h);
    await h.mustRun("sysprompt", "set", "v2-dry");
    const { stdout } = await h.mustRun("sync", "--dry-run");
    expect(stdout).toContain("Dry run");

    const after = await countGenerations(h);
    expect(after).toBe(before);
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

async function countGenerations(h: any): Promise<number> {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(h.storePath());
    return entries.filter((e: string) => !e.endsWith(".build")).length;
  } catch {
    return 0;
  }
}

async function snapshotVendorFiles(h: any): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [k, path] of Object.entries(h.vendorPaths())) {
    out[k] = await h.readFileText(path);
  }
  return out;
}