import { describe, expect, it } from "bun:test";
import {
  buildProjectPlan,
  formatShortCommit,
  getAncestorDirectories,
  getProjectEnabledVendors,
  projectLayout,
  resolveProjectConfigPaths,
  VENDORS,
  vendoredSkillPath,
} from "@ponte/core";

const layout = projectLayout("/repo");
const TOTAL_SKILL_DIRECTORIES = 1 + VENDORS.length;

const findLink = (
  links: readonly { path: string; target: string }[],
  path: string,
) => links.find(l => l.path === path);

describe("projectLayout", () => {
  it("places the links, the sources and the lock file", () => {
    expect(layout.root).toBe("/repo");
    expect(layout.skills).toBe("/repo/.agents/skills");
    expect(layout.sources).toBe("/repo/.ponte/sources");
    expect(layout.lockFile).toBe("/repo/.ponte/lock.toml");
    expect(vendoredSkillPath(layout, "java")).toBe("/repo/.ponte/sources/java");
  });

  it("includes vendor skill directories for each known vendor", () => {
    expect(layout.vendorSkillDirectories).toContain("/repo/.claude/skills");
    expect(layout.vendorSkillDirectories).toContain("/repo/.codex/skills");
    expect(layout.vendorSkillDirectories.length).toBe(VENDORS.length);
  });
});

describe("getProjectEnabledVendors", () => {
  it("returns undefined when no vendors section is present", () => {
    expect(getProjectEnabledVendors({ skills: {} })).toBe(undefined);
  });

  it("returns only enabled vendors", () => {
    const enabled = getProjectEnabledVendors({
      vendors: {
        "claude-code": { enabled: true },
        codex: { enabled: false },
      },
      skills: {},
    });
    expect(enabled).toEqual(["claude-code"]);
  });

  it("returns empty when all vendors are disabled", () => {
    const enabled = getProjectEnabledVendors({
      vendors: { "claude-code": { enabled: false } },
      skills: {},
    });
    expect(enabled).toEqual([]);
  });

  it("returns empty when vendors section exists but lists none", () => {
    expect(getProjectEnabledVendors({ vendors: {}, skills: {} })).toEqual([]);
  });
});

describe("projectLayout with vendor filter", () => {
  it("includes only filtered vendor directories", () => {
    const filtered = projectLayout("/repo", "posix", ["claude-code"]);
    expect(filtered.vendorSkillDirectories).toEqual(["/repo/.claude/skills"]);
  });
});

describe("getAncestorDirectories", () => {
  it("walks up to the filesystem root", () => {
    expect(getAncestorDirectories("/repo/src/app")).toEqual([
      "/repo/src/app",
      "/repo/src",
      "/repo",
      "/",
    ]);
  });

  it("returns the root itself for the root", () => {
    expect(getAncestorDirectories("/")).toEqual(["/"]);
  });
});

describe("buildProjectPlan", () => {
  it("links a vendored skill into agents and all vendor directories", () => {
    const plan = buildProjectPlan(layout, [
      { name: "java", directory: "/repo/.ponte/sources/java" },
    ]);
    expect(findLink(plan.links, "/repo/.agents/skills/java")?.target).toBe(
      "../../.ponte/sources/java",
    );
    expect(findLink(plan.links, "/repo/.claude/skills/java")?.target).toBe(
      "../../.ponte/sources/java",
    );
    expect(plan.links.length).toBe(TOTAL_SKILL_DIRECTORIES);
  });

  it("uses a deeper relative path for vendors with subdirectories", () => {
    const plan = buildProjectPlan(layout, [
      { name: "java", directory: "/repo/.ponte/sources/java" },
    ]);
    const geminiLink = findLink(
      plan.links,
      "/repo/.gemini/antigravity-cli/skills/java",
    );
    expect(geminiLink?.target).toBe("../../../.ponte/sources/java");
  });

  it("keeps a source outside the project absolute", () => {
    const plan = buildProjectPlan(layout, [
      { name: "java", directory: "/elsewhere/java" },
    ]);
    expect(findLink(plan.links, "/repo/.agents/skills/java")?.target).toBe(
      "/elsewhere/java",
    );
    expect(findLink(plan.links, "/repo/.claude/skills/java")?.target).toBe(
      "/elsewhere/java",
    );
  });

  it("owns agents and all vendor skill directories", () => {
    const dirs = buildProjectPlan(layout, []).ownedDirectories;
    expect(dirs).toContain("/repo/.agents/skills");
    expect(dirs).toContain("/repo/.claude/skills");
    expect(dirs.length).toBe(TOTAL_SKILL_DIRECTORIES);
  });
});

describe("resolveProjectConfigPaths", () => {
  it("expands a relative local source against the project root", () => {
    const config = resolveProjectConfigPaths(
      { skills: { mine: { source: "skills/mine" } } },
      "/repo",
    );
    expect(config.skills.mine?.source).toBe("/repo/skills/mine");
  });

  it("preserves vendors through normalization", () => {
    const config = resolveProjectConfigPaths(
      {
        vendors: { "claude-code": { enabled: true } },
        skills: {},
      },
      "/repo",
    );
    expect(config.vendors?.["claude-code"]?.enabled).toBe(true);
  });

  it("omits vendors when absent in the original", () => {
    const config = resolveProjectConfigPaths({ skills: {} }, "/repo");
    expect(config.vendors).toBe(undefined);
  });

  it("leaves git sources and absolute paths untouched", () => {
    const config = resolveProjectConfigPaths(
      {
        skills: {
          git: { source: "https://x/y" },
          abs: { source: "/abs/path" },
        },
      },
      "/repo",
    );
    expect(config.skills.git?.source).toBe("https://x/y");
    expect(config.skills.abs?.source).toBe("/abs/path");
  });
});

describe("formatShortCommit", () => {
  it("keeps the first seven characters", () => {
    expect(formatShortCommit("a1b2c3d4e5f6")).toBe("a1b2c3d");
  });
});
