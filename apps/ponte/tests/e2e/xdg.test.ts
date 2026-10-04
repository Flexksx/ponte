import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { newHarness } from "./harness";

describe("XDG base directories", () => {
  it("keeps the config under XDG_CONFIG_HOME when it is set", async () => {
    const h = await newHarness();
    const configHome = join(h.home, "xdg-config");
    h.setEnv("XDG_CONFIG_HOME", configHome);

    await h.mustRun("sync");

    expect(await h.exists(join(configHome, "ponte", "config.toml"))).toBe(true);
    expect(await h.exists(h.configPath("config.toml"))).toBe(false);
    await h.close();
  });

  it("writes an override prompt under XDG_DATA_HOME when it is set", async () => {
    const h = await newHarness();
    const dataHome = join(h.home, "xdg-data");
    h.setEnv("XDG_DATA_HOME", dataHome);

    await h.mustRun("sync", "-g", "inline prompt text");

    expect(await h.readFileText(join(dataHome, "ponte", "instruction"))).toBe(
      "inline prompt text",
    );
    await h.close();
  });
});
