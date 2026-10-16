import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  buildRepoPlan,
  buildUpdateTargets,
  CLAUDE_CODE_SHARED_SKILLS_VERSION,
  createLockEntry,
  findLockedSkillName,
  getRepoEnabledVendors,
  locksAreEqual,
  repoLayout,
  resolveRepoConfigPaths,
  type VendorVersions,
  vendoredSkillPath,
} from "@ponte/core";

const REPO = "/repo";
const SOURCES = join(REPO, ".ponte", "sources");

const posix = (versions: VendorVersions = {}) => ({
  root: REPO,
  platform: "posix" as const,
  scope: "repo" as const,
  versions,
});

const layout = repoLayout(posix());

// .agents/skills, plus Claude Code and Antigravity, which keep their own.
const LINKED_DIRECTORIES = 3;

// Codex, Cursor, OpenCode and Pi read .agents/skills, so ponte only cleans
// their old directories.
const LEGACY_DIRECTORIES = 4;

const findLink = (
  links: readonly { path: string; target: string }[],
  path: string,
) => links.find(l => l.path === path);

describe("repoLayout", () => {
  it("places the links, the sources and the lock file", () => {
    expect(layout.root).toBe(REPO);
    expect(layout.skills).toBe(join(REPO, ".agents", "skills"));
    expect(layout.sources).toBe(SOURCES);
    expect(layout.lockFile).toBe(join(REPO, ".ponte", "lock.toml"));
    expect(vendoredSkillPath(layout, "java")).toBe(join(SOURCES, "java"));
  });

  it("links only the vendors that do not read .agents/skills", () => {
    expect(layout.vendorSkillDirectories).toEqual([
      join(REPO, ".claude", "skills"),
      join(REPO, ".gemini", "antigravity-cli", "skills"),
    ]);
  });

  it("cleans the old directories of vendors that read .agents/skills", () => {
    expect(layout.legacySkillDirectories).toContain(
      join(REPO, ".codex", "skills"),
    );
    expect(layout.legacySkillDirectories.length).toBe(LEGACY_DIRECTORIES);
  });

  it("moves Claude Code to .agents/skills from the cutoff version", () => {
    const shared = repoLayout(
      posix({ "claude-code": CLAUDE_CODE_SHARED_SKILLS_VERSION }),
    );
    expect(shared.vendorSkillDirectories).toEqual([
      join(REPO, ".gemini", "antigravity-cli", "skills"),
    ]);
    expect(shared.legacySkillDirectories).toContain(
      join(REPO, ".claude", "skills"),
    );
  });
});

describe("getRepoEnabledVendors", () => {
  it("returns undefined when no vendors section is present", () => {
    expect(getRepoEnabledVendors({ skills: [] })).toBe(undefined);
  });

  it("returns only enabled vendors", () => {
    const enabled = getRepoEnabledVendors({
      vendors: {
        "claude-code": { enabled: true },
        codex: { enabled: false },
      },
      skills: [],
    });
    expect(enabled).toEqual(["claude-code"]);
  });

  it("returns empty when all vendors are disabled", () => {
    const enabled = getRepoEnabledVendors({
      vendors: { "claude-code": { enabled: false } },
      skills: [],
    });
    expect(enabled).toEqual([]);
  });

  it("returns empty when vendors section exists but lists none", () => {
    expect(getRepoEnabledVendors({ vendors: {}, skills: [] })).toEqual([]);
  });
});

describe("repoLayout with vendor filter", () => {
  it("includes only filtered vendor directories", () => {
    const filtered = repoLayout(posix(), ["claude-code"]);
    expect(filtered.vendorSkillDirectories).toEqual([
      join(REPO, ".claude", "skills"),
    ]);
    expect(filtered.legacySkillDirectories).toEqual([]);
  });

  it("cleans only the old directories of filtered vendors", () => {
    const filtered = repoLayout(posix(), ["codex"]);
    expect(filtered.vendorSkillDirectories).toEqual([]);
    expect(filtered.legacySkillDirectories).toEqual([
      join(REPO, ".codex", "skills"),
    ]);
  });
});

describe("buildRepoPlan", () => {
  it("links a vendored skill into agents and all vendor directories", () => {
    const plan = buildRepoPlan(layout, [
      { name: "java", directory: join(SOURCES, "java") },
    ]);
    const up2 = join("..", "..", ".ponte", "sources", "java");
    expect(
      findLink(plan.links, join(REPO, ".agents", "skills", "java"))?.target,
    ).toBe(up2);
    expect(
      findLink(plan.links, join(REPO, ".claude", "skills", "java"))?.target,
    ).toBe(up2);
    expect(plan.links.length).toBe(LINKED_DIRECTORIES);
  });

  it("uses a deeper relative path for vendors with subdirectories", () => {
    const plan = buildRepoPlan(layout, [
      { name: "java", directory: join(SOURCES, "java") },
    ]);
    const geminiLink = findLink(
      plan.links,
      join(REPO, ".gemini", "antigravity-cli", "skills", "java"),
    );
    expect(geminiLink?.target).toBe(
      join("..", "..", "..", ".ponte", "sources", "java"),
    );
  });

  it("keeps a source outside the repo absolute", () => {
    const plan = buildRepoPlan(layout, [
      { name: "java", directory: "/elsewhere/java" },
    ]);
    expect(
      findLink(plan.links, join(REPO, ".agents", "skills", "java"))?.target,
    ).toBe("/elsewhere/java");
    expect(
      findLink(plan.links, join(REPO, ".claude", "skills", "java"))?.target,
    ).toBe("/elsewhere/java");
  });

  it("owns the linked and the legacy skill directories", () => {
    const dirs = buildRepoPlan(layout, []).ownedDirectories;
    expect(dirs).toContain(join(REPO, ".agents", "skills"));
    expect(dirs).toContain(join(REPO, ".claude", "skills"));
    expect(dirs).toContain(join(REPO, ".codex", "skills"));
    expect(dirs.length).toBe(LINKED_DIRECTORIES + LEGACY_DIRECTORIES);
  });
});

describe("resolveRepoConfigPaths", () => {
  it("expands a relative local source against the repo root", () => {
    const config = resolveRepoConfigPaths(
      { skills: [{ source: "skills/mine" }] },
      REPO,
    );
    expect(config.skills[0]?.source).toBe(join(REPO, "skills", "mine"));
  });

  it("preserves vendors through normalization", () => {
    const config = resolveRepoConfigPaths(
      {
        vendors: { "claude-code": { enabled: true } },
        skills: [],
      },
      "/repo",
    );
    expect(config.vendors?.["claude-code"]?.enabled).toBe(true);
  });

  it("omits vendors when absent in the original", () => {
    const config = resolveRepoConfigPaths({ skills: [] }, "/repo");
    expect(config.vendors).toBe(undefined);
  });

  it("leaves git sources and absolute paths untouched", () => {
    const config = resolveRepoConfigPaths(
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

  it("keeps the subdir apart from the source", () => {
    const nested = {
      skills: { a: { source: "https://x/y", subdir: "a", commit: "c" } },
    };
    expect(findLockedSkillName(nested, { source: "https://x/ya" })).toBeNull();
  });

  it("treats an absent subdir as empty", () => {
    expect(
      findLockedSkillName(lock, { source: "https://x/z", subdir: "" }),
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
