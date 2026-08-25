import { describe, it, expect } from "bun:test";
import { newHarness } from "./harness";

describe("init", () => {
  it("bootstraps config on first sync", async () => {
    const h = await newHarness();
    const { stdout, stderr } = await h.mustRun("sync");
    const combined = stdout + stderr;
    expect(combined).toContain("Initialized ponte config");

    const cfg = await h.readFileText(h.configPath("config.toml"));
    for (const name of ["claude-code", "codex", "gemini-cli", "cursor-agent"]) {
      expect(cfg).toContain(name);
    }

    expect(await h.readFileText(h.configPath("AGENTS.md"))).toBe("");

    const paths = h.vendorPaths();
    for (const [vendor, path] of Object.entries(paths)) {
      await h.assertFileEquals(path, "");
      void vendor;
    }
    await h.close();
  });

  it("does not re-init on a second sync", async () => {
    const h = await newHarness();
    await h.mustRun("sync");
    const { stdout, stderr } = await h.mustRun("sync");
    const combined = stdout + stderr;
    expect(combined).not.toContain("Initialized ponte config");
    await h.close();
  });
});
