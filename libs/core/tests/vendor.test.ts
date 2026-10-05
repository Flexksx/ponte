import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  buildVendorLayouts,
  CLAUDE_CODE_SHARED_SKILLS_VERSION,
  type LayoutScope,
  parseVersion,
  VENDORS,
  type VendorVersions,
} from "@ponte/core";

const HOME = "/home/u";

const SHARED = join(HOME, ".agents", "skills");

const posix = (versions: VendorVersions = {}, scope: LayoutScope = "global") =>
  buildVendorLayouts({ root: HOME, platform: "posix", scope, versions });

describe("buildVendorLayouts", () => {
  it("nests Antigravity skills and agents below the shared Gemini root", () => {
    expect(posix()["antigravity-cli"]).toEqual({
      instruction: join(HOME, ".gemini", "GEMINI.md"),
      skills: join(HOME, ".gemini", "antigravity-cli", "skills"),
      legacySkills: [],
      agents: join(HOME, ".gemini", "antigravity-cli", "agents"),
    });
  });

  it("keeps opencode under the XDG config root and pi-agent under home", () => {
    const layouts = posix();
    expect(layouts.opencode.instruction).toBe(
      join(HOME, ".config", "opencode", "AGENTS.md"),
    );
    expect(layouts["pi-agent"].agents).toBe(
      join(HOME, ".pi", "agent", "agents"),
    );
  });

  it("moves vendors to AppData on Windows, except pi-agent", () => {
    const layouts = buildVendorLayouts({
      root: "C:/Users/u",
      platform: "win32",
      scope: "global",
      versions: {},
    });
    expect(layouts["claude-code"].instruction).toBe(
      join("C:/Users/u", "AppData", "Roaming", "Claude", "CLAUDE.md"),
    );
    expect(layouts["pi-agent"].instruction).toBe(
      join("C:/Users/u", ".pi", "agent", "AGENTS.md"),
    );
  });

  it("gives every vendor a distinct instruction file", () => {
    const layouts = posix();
    const files = VENDORS.map(name => layouts[name].instruction);
    expect(new Set(files).size).toBe(VENDORS.length);
  });

  it("links Codex, Cursor, OpenCode and Pi skills into .agents/skills", () => {
    const layouts = posix();
    for (const name of ["codex", "cursor-agent", "opencode", "pi-agent"]) {
      expect(layouts[name as keyof typeof layouts].skills).toBe(SHARED);
    }
    expect(layouts.codex.legacySkills).toEqual([
      join(HOME, ".codex", "skills"),
    ]);
  });

  it("keeps Claude Code on its own directory when the version is unknown", () => {
    const claude = posix({}, "project")["claude-code"];
    expect(claude.skills).toBe(join(HOME, ".claude", "skills"));
    expect(claude.legacySkills).toEqual([]);
  });

  it("keeps Claude Code on its own directory below the cutoff", () => {
    const claude = posix({ "claude-code": "2.1.279" }, "project")[
      "claude-code"
    ];
    expect(claude.skills).toBe(join(HOME, ".claude", "skills"));
  });

  it("moves Claude Code to .agents/skills from the cutoff version", () => {
    const claude = posix(
      { "claude-code": CLAUDE_CODE_SHARED_SKILLS_VERSION },
      "project",
    )["claude-code"];
    expect(claude.skills).toBe(SHARED);
    expect(claude.legacySkills).toEqual([join(HOME, ".claude", "skills")]);
  });

  it("keeps Claude Code on its own directory in the global scope", () => {
    const claude = posix({ "claude-code": CLAUDE_CODE_SHARED_SKILLS_VERSION })[
      "claude-code"
    ];
    expect(claude.skills).toBe(join(HOME, ".claude", "skills"));
    expect(claude.legacySkills).toEqual([]);
  });
});

describe("Claude Code version cutoff", () => {
  const claudeSkills = (version: string) =>
    posix({ "claude-code": version }, "project")["claude-code"].skills;

  it("compares each part as a number, not as text", () => {
    expect(claudeSkills("2.1.31")).toBe(join(HOME, ".claude", "skills"));
    expect(claudeSkills("2.2")).toBe(SHARED);
  });

  it("treats a missing part as zero", () => {
    expect(claudeSkills("3")).toBe(SHARED);
    expect(claudeSkills("2.1")).toBe(join(HOME, ".claude", "skills"));
  });
});

describe("parseVersion", () => {
  it("reads the version from the claude --version output", () => {
    expect(parseVersion("2.1.31 (Claude Code)\n")).toBe("2.1.31");
  });

  it("returns null when the output holds no version", () => {
    expect(parseVersion("command failed")).toBeNull();
  });
});
