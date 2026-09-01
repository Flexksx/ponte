import { describe, expect, it } from "bun:test";
import {
  ancestorDirectories,
  normalizeProjectConfig,
  planProject,
  projectLayout,
  shortCommit,
  vendoredSkillPath,
} from "../src/domain/project";
import {
  ConfigError,
  decodeLock,
  decodeProjectConfig,
  encodeLock,
} from "../src/infra/config-codec";

const layout = projectLayout("/repo");

describe("projectLayout", () => {
  it("places the links, the sources and the lock file", () => {
    expect(layout).toEqual({
      root: "/repo",
      skills: "/repo/.agents/skills",
      sources: "/repo/.ponte/sources",
      lockFile: "/repo/.ponte/lock.toml",
    });
    expect(vendoredSkillPath(layout, "java")).toBe("/repo/.ponte/sources/java");
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
  it("links a vendored skill with a relative target", () => {
    expect(planProject(layout, [{ name: "java", directory: "/repo/.ponte/sources/java" }])).toEqual(
      {
        links: [{ path: "/repo/.agents/skills/java", target: "../../.ponte/sources/java" }],
        ownedDirectories: ["/repo/.agents/skills"],
      },
    );
  });

  it("keeps a source outside the project absolute", () => {
    const plan = planProject(layout, [{ name: "java", directory: "/elsewhere/java" }]);
    expect(plan.links).toEqual([{ path: "/repo/.agents/skills/java", target: "/elsewhere/java" }]);
  });

  it("owns only the project skills directory", () => {
    expect(planProject(layout, []).ownedDirectories).toEqual(["/repo/.agents/skills"]);
  });
});

describe("normalizeProjectConfig", () => {
  it("expands a relative local source against the project root", () => {
    const config = normalizeProjectConfig({ skills: { mine: { source: "skills/mine" } } }, "/repo");
    expect(config.skills.mine?.source).toBe("/repo/skills/mine");
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
      decodeProjectConfig({ vendors: {}, system_prompt_file: "AGENTS.md" });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      expect((e as ConfigError).problems.length).toBe(2);
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
