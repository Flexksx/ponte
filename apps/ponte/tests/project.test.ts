import { describe, expect, it } from "bun:test";
import {
  ConfigError,
  decodeLock,
  decodeProjectConfig,
  encodeLock,
} from "../src/infra/config-codec";

describe("decodeProjectConfig", () => {
  it("decodes skill entries as an ordered array", () => {
    const config = decodeProjectConfig({
      skills: [{ source: "https://x/y", ref: "abc", subdir: "sub" }],
    });
    expect(config.skills).toEqual([
      { source: "https://x/y", ref: "abc", subdir: "sub" },
    ]);
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
      skills: [{ source: "https://x/y" }],
    });
    expect(config.vendors?.["claude-code"]?.enabled).toBe(true);
    expect(config.vendors?.codex?.enabled).toBe(false);
  });

  it("treats missing vendors section as all enabled", () => {
    const config = decodeProjectConfig({ skills: [] });
    expect(config.vendors).toBe(undefined);
  });

  it("rejects an unknown vendor name", () => {
    try {
      decodeProjectConfig({
        vendors: { "not-a-vendor": { enabled: true } },
        skills: [],
      });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      expect((e as ConfigError).message).toContain("not-a-vendor");
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

  it("tells a named skill table how to migrate", () => {
    try {
      decodeProjectConfig({ skills: { mine: { source: "skills/mine" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect((e as ConfigError).message).toContain("[[skills]]");
    }
  });
});

describe("lock file", () => {
  it("round-trips the source, the subdir and the commit per skill", () => {
    const lock = {
      skills: {
        mine: { source: "https://x/y", subdir: "sub", commit: "abc123" },
      },
    };
    const encoded = encodeLock(lock);
    expect(encoded).toContain("[skills.mine]");
    expect(encoded).toContain('source = "https://x/y"');
    expect(decodeLock(Bun.TOML.parse(encoded))).toEqual(lock);
  });

  it("omits an empty subdir", () => {
    const encoded = encodeLock({
      skills: { mine: { source: "https://x/y", commit: "abc123" } },
    });
    expect(encoded).not.toContain("subdir");
  });

  it("encodes an empty lock without a table", () => {
    expect(decodeLock(Bun.TOML.parse(encodeLock({ skills: {} })))).toEqual({
      skills: {},
    });
  });

  it("rejects an entry without a commit", () => {
    try {
      decodeLock({ skills: { mine: { source: "https://x/y" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
    }
  });

  it("rejects a lock entry from an older ponte that has no source", () => {
    try {
      decodeLock({ skills: { mine: { commit: "abc123" } } });
      expect(true).toBe(false);
    } catch (e) {
      expect(e instanceof ConfigError).toBe(true);
      expect((e as ConfigError).message).toContain("source");
    }
  });
});
