import { describe, expect, it } from "bun:test";
import {
  decodeLock,
  decodeRepoConfig,
  encodeLock,
} from "../src/infra/config-codec";
import { getAncestorDirectories } from "../src/infra/repo-file";
import { decoded, issuesOf, issueText } from "./codec-helpers";

describe("decodeRepoConfig", () => {
  it("decodes skill entries as an ordered array", () => {
    const config = decoded(
      decodeRepoConfig({
        skills: [{ source: "https://x/y", ref: "abc", subdir: "sub" }],
      }),
    );
    expect(config.skills).toEqual([
      { source: "https://x/y", ref: "abc", subdir: "sub" },
    ]);
  });

  it("rejects an unknown top-level key", () => {
    const issues = issuesOf(
      decodeRepoConfig({
        unknown_key: {},
        system_prompt_file: "AGENTS.md",
      }),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.length).toBe(2);
  });

  it("accepts an optional vendors section", () => {
    const config = decoded(
      decodeRepoConfig({
        vendors: {
          "claude-code": { enabled: true },
          codex: { enabled: false },
        },
        skills: [{ source: "https://x/y" }],
      }),
    );
    expect(config.vendors?.["claude-code"]?.enabled).toBe(true);
    expect(config.vendors?.codex?.enabled).toBe(false);
  });

  it("treats missing vendors section as all enabled", () => {
    const config = decoded(decodeRepoConfig({ skills: [] }));
    expect(config.vendors).toBe(undefined);
  });

  it("rejects an unknown vendor name", () => {
    const issues = issuesOf(
      decodeRepoConfig({
        vendors: { "not-a-vendor": { enabled: true } },
        skills: [],
      }),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issueText(issues)).toContain("not-a-vendor");
  });

  it("rejects an entry without a source", () => {
    const issues = issuesOf(decodeRepoConfig({ skills: [{ ref: "abc" }] }));
    expect(issues.length).toBeGreaterThan(0);
  });

  it("tells a named skill table how to migrate", () => {
    const issues = issuesOf(
      decodeRepoConfig({ skills: { mine: { source: "skills/mine" } } }),
    );
    expect(issueText(issues)).toContain("[[skills]]");
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
    expect(decoded(decodeLock(Bun.TOML.parse(encoded)))).toEqual(lock);
  });

  it("omits an empty subdir", () => {
    const encoded = encodeLock({
      skills: { mine: { source: "https://x/y", commit: "abc123" } },
    });
    expect(encoded).not.toContain("subdir");
  });

  it("encodes an empty lock without a table", () => {
    expect(
      decoded(decodeLock(Bun.TOML.parse(encodeLock({ skills: {} })))),
    ).toEqual({
      skills: {},
    });
  });

  it("rejects an entry without a commit", () => {
    const issues = issuesOf(
      decodeLock({ skills: { mine: { source: "https://x/y" } } }),
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it("rejects a lock entry from an older ponte that has no source", () => {
    const issues = issuesOf(
      decodeLock({ skills: { mine: { commit: "abc123" } } }),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issueText(issues)).toContain("source");
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
