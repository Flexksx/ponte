import { describe, expect, it } from "bun:test";
import { ConfigError, decodeConfig } from "../src/infra/config-codec";

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
      skills: { s: { source: 42 } },
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
