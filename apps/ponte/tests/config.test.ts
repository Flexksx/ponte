import { describe, expect, it } from "bun:test";
import { type Config, normalizeConfig, type SourceEntry, sourceKey } from "../src/domain/config";
import { isGitSource, parseSource } from "../src/domain/source";
import { ConfigError, decodeConfig, encodeConfig } from "../src/infra/config-codec";

const cfgWith = (skills: readonly SourceEntry[] = []) =>
  ({
    systemPromptFile: "AGENTS.md",
    vendors: {},
    skills,
    subagents: {},
  }) as Config;

describe("isGitSource", () => {
  it("recognises URL schemes", () => {
    expect(isGitSource("https://x/y")).toBe(true);
    expect(isGitSource("http://x/y")).toBe(true);
    expect(isGitSource("git@github.com:x/y")).toBe(true);
    expect(isGitSource("file:///tmp/r")).toBe(true);
  });
  it("rejects bare paths", () => {
    expect(isGitSource("skills/my-skill")).toBe(false);
    expect(isGitSource("/abs/path")).toBe(false);
  });
});

describe("parseSource", () => {
  it("parses a git source", () => {
    expect(parseSource("https://x/y", "abc", "sub")).toEqual({
      type: "git",
      url: "https://x/y",
      ref: "abc",
      subdir: "sub",
    });
  });
  it("parses a local source and drops git-only fields", () => {
    expect(parseSource("/local/dir")).toEqual({ type: "local", path: "/local/dir" });
  });
});

describe("decodeConfig", () => {
  const base = {
    system_prompt_file: "AGENTS.md",
    vendors: { "claude-code": { enabled: true } },
  };

  it("decodes a valid config", () => {
    const cfg = decodeConfig(base);
    expect(cfg.systemPromptFile).toBe("AGENTS.md");
    expect(cfg.vendors["claude-code"]?.enabled).toBe(true);
  });

  it("defaults systemPromptFile when omitted", () => {
    const cfg = decodeConfig({ vendors: {} });
    expect(cfg.systemPromptFile).toBe("AGENTS.md");
  });

  it("rejects an unknown agent name", () => {
    try {
      decodeConfig({ vendors: { claude_code: { enabled: true } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
    }
  });

  it("reports every problem at once", () => {
    const bad = {
      system_prompt_file: 123,
      vendors: "nope",
      skills: [{ source: 42 }],
    };
    try {
      decodeConfig(bad);
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      const problems = (e as ConfigError).problems;
      expect(problems.length).toBeGreaterThan(1);
    }
  });

  it("decodes an array of nameless skill entries", () => {
    const cfg = decodeConfig({
      ...base,
      skills: [{ source: "skills/one" }, { source: "https://x/y", ref: "abc", subdir: "sub" }],
    });
    expect(cfg.skills).toEqual([
      { source: "skills/one" },
      { source: "https://x/y", ref: "abc", subdir: "sub" },
    ]);
  });

  it("tells the user to migrate the old named skill tables", () => {
    try {
      decodeConfig({ ...base, skills: { "my-skill": { source: "skills/my-skill" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      expect((e as ConfigError).problems[0]).toContain("[[skills]]");
      expect((e as ConfigError).problems[0]).toContain("SKILL.md");
    }
  });

  it("round-trips the skills array through encodeConfig", () => {
    const encoded = encodeConfig(cfgWith([{ source: "skills/one" }, { source: "skills/two" }]));
    expect(encoded).toContain("[[skills]]");
    expect(decodeConfig(Bun.TOML.parse(encoded)).skills).toEqual([
      { source: "skills/one" },
      { source: "skills/two" },
    ]);
  });
});

describe("normalizeConfig", () => {
  it("expands relative local paths against the config dir", () => {
    const norm = normalizeConfig(cfgWith([{ source: "skills/s" }]), "/cfg");
    expect(norm.skills[0]?.source).toBe("/cfg/skills/s");
  });

  it("leaves git sources and absolute paths untouched", () => {
    const norm = normalizeConfig(
      cfgWith([{ source: "https://x/y" }, { source: "/abs/path" }]),
      "/cfg",
    );
    expect(norm.skills[0]?.source).toBe("https://x/y");
    expect(norm.skills[1]?.source).toBe("/abs/path");
  });
});

describe("sourceKey", () => {
  it("separates entries by source and subdir", () => {
    expect(sourceKey({ source: "https://x/y" })).toBe(sourceKey({ source: "https://x/y" }));
    expect(sourceKey({ source: "https://x/y", subdir: "a" })).not.toBe(
      sourceKey({ source: "https://x/y", subdir: "b" }),
    );
    expect(sourceKey({ source: "https://x/y" })).not.toBe(sourceKey({ source: "https://x/z" }));
  });
});
