import { describe, expect, it } from "bun:test";
import {
  buildProjectPlan,
  buildUpdateTargets,
  createLockEntry,
  findLockedSkillName,
  formatShortCommit,
  getAncestorDirectories,
  getProjectEnabledVendors,
  locksAreEqual,
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
    expect(getProjectEnabledVendors({ skills: [] })).toBe(undefined);
  });

  it("returns only enabled vendors", () => {
    const enabled = getProjectEnabledVendors({
      vendors: {
        "claude-code": { enabled: true },
        codex: { enabled: false },
      },
      skills: [],
    });
    expect(enabled).toEqual(["claude-code"]);
  });

  it("returns empty when all vendors are disabled", () => {
    const enabled = getProjectEnabledVendors({
      vendors: { "claude-code": { enabled: false } },
      skills: [],
    });
    expect(enabled).toEqual([]);
  });

  it("returns empty when vendors section exists but lists none", () => {
    expect(getProjectEnabledVendors({ vendors: {}, skills: [] })).toEqual([]);
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
      { skills: [{ source: "skills/mine" }] },
      "/repo",
    );
    expect(config.skills[0]?.source).toBe("/repo/skills/mine");
  });

  it("preserves vendors through normalization", () => {
    const config = resolveProjectConfigPaths(
      {
        vendors: { "claude-code": { enabled: true } },
        skills: [],
      },
      "/repo",
    );
    expect(config.vendors?.["claude-code"]?.enabled).toBe(true);
  });

  it("omits vendors when absent in the original", () => {
    const config = resolveProjectConfigPaths({ skills: [] }, "/repo");
    expect(config.vendors).toBe(undefined);
  });

  it("leaves git sources and absolute paths untouched", () => {
    const config = resolveProjectConfigPaths(
      { skills: [{ source: "https://x/y" }, { source: "/abs/path" }] },
      "/repo",
    );
    expect(config.skills[0]?.source).toBe("https://x/y");
    expect(config.skills[1]?.source).toBe("/abs/path");
  });
});

describe("findLockedSkillName", () => {
  const lock = {
    skills: {
      "ast-grep": { source: "https://x/y", subdir: "ast", commit: "abc" },
      plain: { source: "https://x/z", commit: "def" },
    },
  };

  it("matches an entry on source and subdir together", () => {
    expect(
      findLockedSkillName(lock, { source: "https://x/y", subdir: "ast" }),
    ).toBe("ast-grep");
  });

  it("ignores the ref, because a lock entry holds the resolved commit", () => {
    expect(
      findLockedSkillName(lock, {
        source: "https://x/z",
        ref: "main",
      }),
    ).toBe("plain");
  });

  it("returns null when the subdir differs", () => {
    expect(
      findLockedSkillName(lock, { source: "https://x/y", subdir: "other" }),
    ).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(
      findLockedSkillName(lock, { source: "https://x/absent" }),
    ).toBeNull();
  });
});

describe("createLockEntry", () => {
  it("keeps the source, the subdir and the commit", () => {
    expect(
      createLockEntry({ source: "https://x/y", ref: "main", subdir: "a" }, "c"),
    ).toEqual({ source: "https://x/y", subdir: "a", commit: "c" });
  });

  it("omits an empty subdir", () => {
    expect(createLockEntry({ source: "https://x/y" }, "c")).toEqual({
      source: "https://x/y",
      commit: "c",
    });
  });
});

describe("locksAreEqual", () => {
  const lock = { skills: { a: { source: "https://x/y", commit: "c1" } } };

  it("is true for the same entries", () => {
    expect(
      locksAreEqual(lock, {
        skills: { a: { source: "https://x/y", commit: "c1" } },
      }),
    ).toBe(true);
  });

  it("is false when a commit differs", () => {
    expect(
      locksAreEqual(lock, {
        skills: { a: { source: "https://x/y", commit: "c2" } },
      }),
    ).toBe(false);
  });

  it("is false when the entry count differs", () => {
    expect(locksAreEqual(lock, { skills: {} })).toBe(false);
  });
});

describe("buildUpdateTargets", () => {
  const entry = { source: "https://x/y", ref: "main" };
  const lock = {
    skills: { "ast-grep": { source: "https://x/y", commit: "c1" } },
  };

  it("names each target after its lock entry", () => {
    expect(buildUpdateTargets({ skills: [entry] }, lock)).toEqual([
      { name: "ast-grep", entry },
    ]);
  });

  it("skips a lock entry the config no longer declares", () => {
    expect(buildUpdateTargets({ skills: [] }, lock)).toEqual([]);
  });

  it("skips a config entry that is not locked", () => {
    expect(
      buildUpdateTargets({ skills: [{ source: "skills/local" }] }, lock),
    ).toEqual([]);
  });
});

describe("formatShortCommit", () => {
  it("keeps the first seven characters", () => {
    expect(formatShortCommit("a1b2c3d4e5f6")).toBe("a1b2c3d");
  });
});
