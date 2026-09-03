import { describe, expect, it } from "bun:test";
import {
  ancestorDirectories,
  normalizeProjectConfig,
  planProject,
  projectEnabledVendors,
  projectLayout,
  shortCommit,
  vendoredSkillPath,
} from "../src/domain/project";
import { VENDORS } from "../src/domain/vendor";
import {
  ConfigError,
  decodeLock,
  decodeProjectConfig,
  encodeLock,
} from "../src/infra/config-codec";

const layout = projectLayout("/repo");
const TOTAL_SKILL_DIRECTORIES = 1 + VENDORS.length;

const findLink = (links: readonly { path: string; target: string }[], path: string) =>
  links.find(l => l.path === path);

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

describe("projectEnabledVendors", () => {
  it("returns undefined when no vendors section is present", () => {
    expect(projectEnabledVendors({ skills: {} })).toBe(undefined);
  });

  it("returns only enabled vendors", () => {
    const enabled = projectEnabledVendors({
      vendors: { "claude-code": { enabled: true }, codex: { enabled: false } },
      skills: {},
    });
    expect(enabled).toEqual(["claude-code"]);
  });

  it("returns empty when all vendors are disabled", () => {
    const enabled = projectEnabledVendors({
      vendors: { "claude-code": { enabled: false } },
      skills: {},
    });
    expect(enabled).toEqual([]);
  });

  it("returns empty when vendors section exists but lists none", () => {
    expect(projectEnabledVendors({ vendors: {}, skills: {} })).toEqual([]);
  });
});

describe("projectLayout with vendor filter", () => {
  it("includes only filtered vendor directories", () => {
    const filtered = projectLayout("/repo", "posix", ["claude-code"]);
    expect(filtered.vendorSkillDirectories).toEqual(["/repo/.claude/skills"]);
  });
});

describe("ancestorDirectories", () => {
  it("walks up to the filesystem root", () => {
    expect(ancestorDirectories("/repo/src/app")).toEqual([
      "/repo/src/app",
      "/repo/src",
      "/repo",
      "/",
    ]);
  });

  it("returns the root itself for the root", () => {
    expect(ancestorDirectories("/")).toEqual(["/"]);
  });
});

describe("planProject", () => {
  it("links a vendored skill into agents and all vendor directories", () => {
    const plan = planProject(layout, [{ name: "java", directory: "/repo/.ponte/sources/java" }]);
    expect(findLink(plan.links, "/repo/.agents/skills/java")?.target).toBe(
      "../../.ponte/sources/java",
    );
    expect(findLink(plan.links, "/repo/.claude/skills/java")?.target).toBe(
      "../../.ponte/sources/java",
    );
    expect(plan.links.length).toBe(TOTAL_SKILL_DIRECTORIES);
  });

  it("uses a deeper relative path for vendors with subdirectories", () => {
    const plan = planProject(layout, [{ name: "java", directory: "/repo/.ponte/sources/java" }]);
    const geminiLink = findLink(plan.links, "/repo/.gemini/antigravity-cli/skills/java");
    expect(geminiLink?.target).toBe("../../../.ponte/sources/java");
  });

  it("keeps a source outside the project absolute", () => {
    const plan = planProject(layout, [{ name: "java", directory: "/elsewhere/java" }]);
    expect(findLink(plan.links, "/repo/.agents/skills/java")?.target).toBe("/elsewhere/java");
    expect(findLink(plan.links, "/repo/.claude/skills/java")?.target).toBe("/elsewhere/java");
  });

  it("owns agents and all vendor skill directories", () => {
    const dirs = planProject(layout, []).ownedDirectories;
    expect(dirs).toContain("/repo/.agents/skills");
    expect(dirs).toContain("/repo/.claude/skills");
    expect(dirs.length).toBe(TOTAL_SKILL_DIRECTORIES);
  });
});

describe("normalizeProjectConfig", () => {
  it("expands a relative local source against the project root", () => {
    const config = normalizeProjectConfig({ skills: { mine: { source: "skills/mine" } } }, "/repo");
    expect(config.skills.mine?.source).toBe("/repo/skills/mine");
  });

  it("preserves vendors through normalization", () => {
    const config = normalizeProjectConfig(
      { vendors: { "claude-code": { enabled: true } }, skills: {} },
      "/repo",
    );
    expect(config.vendors?.["claude-code"]?.enabled).toBe(true);
  });

  it("omits vendors when absent in the original", () => {
    const config = normalizeProjectConfig({ skills: {} }, "/repo");
    expect(config.vendors).toBe(undefined);
  });

  it("leaves git sources and absolute paths untouched", () => {
    const config = normalizeProjectConfig(
      { skills: { git: { source: "https://x/y" }, abs: { source: "/abs/path" } } },
      "/repo",
    );
    expect(config.skills.git?.source).toBe("https://x/y");
    expect(config.skills.abs?.source).toBe("/abs/path");
  });
});

describe("decodeProjectConfig", () => {
  it("decodes skill entries", () => {
    const config = decodeProjectConfig({
      skills: { mine: { source: "https://x/y", ref: "abc", subdir: "sub" } },
    });
    expect(config.skills.mine).toEqual({ source: "https://x/y", ref: "abc", subdir: "sub" });
  });

  it("rejects an unknown top-level key", () => {
    try {
      decodeProjectConfig({ unknown_key: {}, system_prompt_file: "AGENTS.md" });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      expect((e as ConfigError).problems.length).toBe(2);
    }
  });

  it("accepts an optional vendors section", () => {
    const config = decodeProjectConfig({
      vendors: { "claude-code": { enabled: true }, codex: { enabled: false } },
      skills: { mine: { source: "https://x/y" } },
    });
    expect(config.vendors?.["claude-code"]?.enabled).toBe(true);
    expect(config.vendors?.codex?.enabled).toBe(false);
  });

  it("treats missing vendors section as all enabled", () => {
    const config = decodeProjectConfig({ skills: {} });
    expect(config.vendors).toBe(undefined);
  });

  it("rejects an unknown vendor name", () => {
    try {
      decodeProjectConfig({ vendors: { "not-a-vendor": { enabled: true } }, skills: {} });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      expect((e as ConfigError).message).toContain("not-a-vendor");
    }
  });

  it("rejects an entry without a source", () => {
    try {
      decodeProjectConfig({ skills: { mine: { ref: "abc" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
    }
  });
});

describe("lock file", () => {
  it("round-trips a commit per skill", () => {
    const encoded = encodeLock({ skills: { mine: { commit: "abc123" } } });
    expect(encoded).toContain('[skills.mine]\ncommit = "abc123"');
    expect(decodeLock(Bun.TOML.parse(encoded))).toEqual({ skills: { mine: { commit: "abc123" } } });
  });

  it("encodes an empty lock without a table", () => {
    expect(decodeLock(Bun.TOML.parse(encodeLock({ skills: {} })))).toEqual({ skills: {} });
  });

  it("rejects an entry without a commit", () => {
    try {
      decodeLock({ skills: { mine: {} } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
    }
  });
});

describe("shortCommit", () => {
  it("keeps the first seven characters", () => {
    expect(shortCommit("a1b2c3d4e5f6")).toBe("a1b2c3d");
  });
});
