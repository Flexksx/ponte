import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { VENDORS, vendorLayouts } from "../src/domain/vendor";

describe("vendorLayouts", () => {
  it("nests Antigravity skills and agents below the shared Gemini root", () => {
    const layouts = vendorLayouts("/home/u", "posix");
    expect(layouts["antigravity-cli"]).toEqual({
      instruction: "/home/u/.gemini/GEMINI.md",
      skills: "/home/u/.gemini/antigravity-cli/skills",
      agents: "/home/u/.gemini/antigravity-cli/agents",
    });
  });

  it("keeps opencode under the XDG config root and pi-agent under home", () => {
    const layouts = vendorLayouts("/home/u", "posix");
    expect(layouts.opencode.instruction).toBe("/home/u/.config/opencode/AGENTS.md");
    expect(layouts["pi-agent"].skills).toBe("/home/u/.pi/agent/skills");
  });

  it("moves vendors to AppData on Windows, except pi-agent", () => {
    const layouts = vendorLayouts("C:/Users/u", "win32");
    expect(layouts["claude-code"].instruction).toBe(
      join("C:/Users/u", "AppData", "Roaming", "Claude", "CLAUDE.md"),
    );
    expect(layouts["pi-agent"].instruction).toBe(join("C:/Users/u", ".pi", "agent", "AGENTS.md"));
  });

  it("gives every vendor a distinct instruction file", () => {
    const layouts = vendorLayouts("/home/u", "posix");
    const files = VENDORS.map(name => layouts[name].instruction);
    expect(new Set(files).size).toBe(VENDORS.length);
  });
});
