import { describe, expect, it } from "bun:test";
import {
  ConfigError,
  decodeConfig,
  encodeConfig,
} from "../src/infra/config-codec";

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

  it("decodes skills and subagents as ordered arrays", () => {
    const cfg = decodeConfig({
      ...base,
      skills: [
        { source: "skills/a" },
        { source: "https://x/y", ref: "abc", subdir: "sub" },
      ],
      subagents: [{ source: "subagents/claude" }],
    });
    expect(cfg.skills).toEqual([
      { source: "skills/a" },
      { source: "https://x/y", ref: "abc", subdir: "sub" },
    ]);
    expect(cfg.subagents).toEqual([{ source: "subagents/claude" }]);
  });

  it("defaults skills and subagents to empty arrays", () => {
    const cfg = decodeConfig(base);
    expect(cfg.skills).toEqual([]);
    expect(cfg.subagents).toEqual([]);
  });

  it("rejects an unknown agent name", () => {
    try {
      decodeConfig({ vendors: { claude_code: { enabled: true } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
    }
  });

  it("tells a named skill table how to migrate", () => {
    try {
      decodeConfig({ ...base, skills: { mine: { source: "skills/mine" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      const message = (e as ConfigError).message;
      expect(message).toContain("[[skills]]");
      expect(message).toContain("SKILL.md");
    }
  });

  it("tells a named subagent table how to migrate", () => {
    try {
      decodeConfig({ ...base, subagents: { claude: { source: "s" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      const message = (e as ConfigError).message;
      expect(message).toContain("[[subagents]]");
      expect(message).toContain("after its file");
    }
  });

  it("reports the index of a bad entry", () => {
    try {
      decodeConfig({ ...base, skills: [{ source: "ok" }, { ref: "abc" }] });
      expect(true).toBe(false);
    } catch (e) {
      expect((e as ConfigError).message).toContain("skills[1].source");
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
});

describe("encodeConfig", () => {
  it("round-trips skills and subagents through array-of-table sections", () => {
    const config = decodeConfig({
      system_prompt_file: "AGENTS.md",
      vendors: { "claude-code": { enabled: true } },
      skills: [{ source: "https://x/y", ref: "abc", subdir: "sub" }],
      subagents: [{ source: "subagents/claude" }],
    });
    const encoded = encodeConfig(config);
    expect(encoded).toContain("[[skills]]");
    expect(encoded).toContain("[[subagents]]");
    expect(decodeConfig(Bun.TOML.parse(encoded))).toEqual(config);
  });
});
