import { describe, expect, it } from "bun:test";
import { newHarness } from "./harness";

describe("status", () => {
  it("reports in sync after a sync", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", "stable");
    await h.mustRun("sync");

    const { stdout } = await h.mustRun("status");
    expect(stdout).toContain("Would-be generation:");
    expect(stdout).toContain("in sync");
    await h.close();
  });

  it("reports drift after an unsynced prompt change", async () => {
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sysprompt", "set", "v1");
    await h.mustRun("sync");

    await h.mustRun("sysprompt", "set", "v2-unsynced");

    const { stdout } = await h.mustRun("status");
    expect(stdout).toContain("drifted");
    await h.close();
  });

  it("reports a disabled vendor as disabled", async () => {
    const h = await newHarness();
    await h.bootstrap();

    const cfg = await h.readFileText(h.configPath("config.toml"));
    const withDisabled = cfg.replace(
      "[vendors.codex]\nenabled = true",
      "[vendors.codex]\nenabled = false",
    );
    await h.writeFile(h.configPath("config.toml"), withDisabled);

    const { stdout } = await h.mustRun("status");
    expect(stdout).toContain("disabled");
    await h.close();
  });
});
