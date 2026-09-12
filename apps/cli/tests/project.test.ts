import { describe, expect, it } from "bun:test";
import {
  ConfigError,
  decodeLock,
  decodeProjectConfig,
  encodeLock,
} from "../src/infra/config-codec";

describe("decodeProjectConfig", () => {
  it("decodes skill entries", () => {
    const config = decodeProjectConfig({
      skills: {
        mine: { source: "https://x/y", ref: "abc", subdir: "sub" },
      },
    });
    expect(config.skills.mine).toEqual({
      source: "https://x/y",
      ref: "abc",
      subdir: "sub",
    });
  });

  it("rejects an unknown top-level key", () => {
    try {
      decodeProjectConfig({
        unknown_key: {},
        system_prompt_file: "AGENTS.md",
      });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      expect((e as ConfigError).problems.length).toBe(2);
    }
  });

  it("accepts an optional vendors section", () => {
    const config = decodeProjectConfig({
      vendors: {
        "claude-code": { enabled: true },
        codex: { enabled: false },
      },
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
      decodeProjectConfig({
        vendors: { "not-a-vendor": { enabled: true } },
        skills: {},
      });
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
    const encoded = encodeLock({
      skills: { mine: { commit: "abc123" } },
    });
    expect(encoded).toContain('[skills.mine]\ncommit = "abc123"');
    expect(decodeLock(Bun.TOML.parse(encoded))).toEqual({
      skills: { mine: { commit: "abc123" } },
    });
  });

  it("encodes an empty lock without a table", () => {
    expect(decodeLock(Bun.TOML.parse(encodeLock({ skills: {} })))).toEqual({
      skills: {},
    });
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
