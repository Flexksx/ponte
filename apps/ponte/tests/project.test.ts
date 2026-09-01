import { describe, expect, it } from "bun:test";
import {
  ancestorDirectories,
  lockEquals,
  lockedSkillName,
  normalizeProjectConfig,
  planProject,
  projectLayout,
  projectState,
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
    const config = normalizeProjectConfig({ skills: [{ source: "skills/mine" }] }, "/repo");
    expect(config.skills[0]?.source).toBe("/repo/skills/mine");
  });

  it("leaves git sources and absolute paths untouched", () => {
    const config = normalizeProjectConfig(
      { skills: [{ source: "https://x/y" }, { source: "/abs/path" }] },
      "/repo",
    );
    expect(config.skills[0]?.source).toBe("https://x/y");
    expect(config.skills[1]?.source).toBe("/abs/path");
  });
});

describe("decodeProjectConfig", () => {
  it("decodes nameless skill entries", () => {
    const config = decodeProjectConfig({
      skills: [{ source: "https://x/y", ref: "abc", subdir: "sub" }],
    });
    expect(config.skills).toEqual([{ source: "https://x/y", ref: "abc", subdir: "sub" }]);
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
      decodeProjectConfig({ skills: [{ ref: "abc" }] });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
    }
  });

  it("tells the user to migrate the old named skill tables", () => {
    try {
      decodeProjectConfig({ skills: { mine: { source: "skills/mine" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect((e as ConfigError).problems[0]).toContain("[[skills]]");
    }
  });
});

describe("lock file", () => {
  it("round-trips the source, the subdir and the commit per skill", () => {
    const lock = {
      skills: { mine: { source: "https://x/y", subdir: "sub", commit: "abc123" } },
    };
    const encoded = encodeLock(lock);
    expect(encoded).toContain("[skills.mine]");
    expect(decodeLock(Bun.TOML.parse(encoded))).toEqual(lock);
  });

  it("omits an empty subdir", () => {
    const encoded = encodeLock({ skills: { mine: { source: "https://x/y", commit: "abc" } } });
    expect(encoded).not.toContain("subdir");
  });

  it("encodes an empty lock without a table", () => {
    expect(decodeLock(Bun.TOML.parse(encodeLock({ skills: {} })))).toEqual({ skills: {} });
  });

  it("rejects an entry without a commit or a source", () => {
    for (const skills of [{ mine: {} }, { mine: { source: "https://x/y" } }]) {
      try {
        decodeLock({ skills });
        expect(true).toBe(false);
      } catch (e) {
        expect(e instanceof ConfigError).toBe(true);
      }
    }
  });
});

describe("lockedSkillName", () => {
  const lock = {
    skills: {
      one: { source: "https://x/y", commit: "a" },
      two: { source: "https://x/y", subdir: "sub", commit: "b" },
    },
  };

  it("matches on the source and the subdir together", () => {
    expect(lockedSkillName(lock, { source: "https://x/y" })).toBe("one");
    expect(lockedSkillName(lock, { source: "https://x/y", subdir: "sub" })).toBe("two");
  });

  it("ignores the ref", () => {
    expect(lockedSkillName(lock, { source: "https://x/y", ref: "other" })).toBe("one");
  });

  it("returns null for an unlocked source", () => {
    expect(lockedSkillName(lock, { source: "https://other/repo" })).toBeNull();
  });
});

describe("lockEquals", () => {
  const lock = { skills: { one: { source: "https://x/y", commit: "a" } } };

  it("is true for the same entries", () => {
    expect(lockEquals(lock, { skills: { one: { source: "https://x/y", commit: "a" } } })).toBe(
      true,
    );
  });

  it("is false when a commit, a source or a name changes", () => {
    expect(lockEquals(lock, { skills: { one: { source: "https://x/y", commit: "b" } } })).toBe(
      false,
    );
    expect(lockEquals(lock, { skills: { one: { source: "https://x/z", commit: "a" } } })).toBe(
      false,
    );
    expect(lockEquals(lock, { skills: { two: { source: "https://x/y", commit: "a" } } })).toBe(
      false,
    );
    expect(lockEquals(lock, { skills: {} })).toBe(false);
  });
});

describe("projectState", () => {
  const plan = planProject(layout, [{ name: "java", directory: "/repo/.ponte/sources/java" }]);
  const actual = new Map([["/repo/.agents/skills/java", "../../.ponte/sources/java"]]);

  it("has drifted while an entry still waits to be vendored", () => {
    expect(projectState(plan, actual, 1)).toBe("drifted");
  });

  it("defers to the link state when nothing is pending", () => {
    expect(projectState(plan, actual, 0)).toBe("in sync");
    expect(projectState(plan, new Map(), 1)).toBe("not synced");
  });
});

describe("shortCommit", () => {
  it("keeps the first seven characters", () => {
    expect(shortCommit("a1b2c3d4e5f6")).toBe("a1b2c3d");
  });
});
