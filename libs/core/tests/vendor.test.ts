import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { buildVendorLayouts, VENDORS } from "@ponte/core";

const HOME = "/home/u";

describe("buildVendorLayouts", () => {
  it("nests Antigravity skills and agents below the shared Gemini root", () => {
    const layouts = buildVendorLayouts(HOME, "posix");
    expect(layouts["antigravity-cli"]).toEqual({
      instruction: join(HOME, ".gemini", "GEMINI.md"),
      skills: join(HOME, ".gemini", "antigravity-cli", "skills"),
      agents: join(HOME, ".gemini", "antigravity-cli", "agents"),
    });
  });

  it("keeps opencode under the XDG config root and pi-agent under home", () => {
    const layouts = buildVendorLayouts(HOME, "posix");
    expect(layouts.opencode.instruction).toBe(
      join(HOME, ".config", "opencode", "AGENTS.md"),
    );
    expect(layouts["pi-agent"].skills).toBe(
      join(HOME, ".pi", "agent", "skills"),
    );
  });

  it("moves vendors to AppData on Windows, except pi-agent", () => {
    const layouts = buildVendorLayouts("C:/Users/u", "win32");
    expect(layouts["claude-code"].instruction).toBe(
      join("C:/Users/u", "AppData", "Roaming", "Claude", "CLAUDE.md"),
    );
    expect(layouts["pi-agent"].instruction).toBe(
      join("C:/Users/u", ".pi", "agent", "AGENTS.md"),
    );
  });

  it("gives every vendor a distinct instruction file", () => {
    const layouts = buildVendorLayouts(HOME, "posix");
    const files = VENDORS.map(name => layouts[name].instruction);
    expect(new Set(files).size).toBe(VENDORS.length);
  });
});
