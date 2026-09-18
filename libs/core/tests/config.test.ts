import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  type Config,
  isGitSource,
  parseSource,
  resolveConfigPaths,
  type SourceEntry,
  sourceKey,
} from "@ponte/core";

const cfgWith = (skills: readonly SourceEntry[] = []) =>
  ({
    systemPromptFile: "AGENTS.md",
    vendors: {},
    skills,
    subagents: [],
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
    expect(parseSource("/local/dir")).toEqual({
      type: "local",
      path: "/local/dir",
    });
  });
});

describe("resolveConfigPaths", () => {
  it("expands relative local paths against the config dir", () => {
    const norm = resolveConfigPaths(cfgWith([{ source: "skills/s" }]), "/cfg");
    expect(norm.skills[0]?.source).toBe(join("/cfg", "skills", "s"));
  });

  it("leaves git sources and absolute paths untouched", () => {
    const norm = resolveConfigPaths(
      cfgWith([{ source: "https://x/y" }, { source: "/abs/path" }]),
      "/cfg",
    );
    expect(norm.skills[0]?.source).toBe("https://x/y");
    expect(norm.skills[1]?.source).toBe("/abs/path");
  });
});

describe("sourceKey", () => {
  it("separates the source from the subdir", () => {
    expect(sourceKey({ source: "https://x/y", subdir: "a" })).not.toBe(
      sourceKey({ source: "https://x/ya", subdir: "" }),
    );
  });

  it("treats an absent subdir as empty", () => {
    expect(sourceKey({ source: "https://x/y" })).toBe(
      sourceKey({ source: "https://x/y", subdir: "" }),
    );
  });
});
