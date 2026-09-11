import { describe, expect, it } from "bun:test";
import {
  type Config,
  isGitSource,
  parseSource,
  resolveConfigPaths,
  type SourceEntry,
} from "@ponte/core";

const cfgWith = (skills: Record<string, SourceEntry> = {}) =>
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
    expect(parseSource("/local/dir")).toEqual({
      type: "local",
      path: "/local/dir",
    });
  });
});

describe("resolveConfigPaths", () => {
  it("expands relative local paths against the config dir", () => {
    const norm = resolveConfigPaths(
      cfgWith({ s: { source: "skills/s" } }),
      "/cfg",
    );
    expect(norm.skills.s?.source).toBe("/cfg/skills/s");
  });

  it("leaves git sources and absolute paths untouched", () => {
    const norm = resolveConfigPaths(
      cfgWith({
        git: { source: "https://x/y" },
        abs: { source: "/abs/path" },
      }),
      "/cfg",
    );
    expect(norm.skills.git?.source).toBe("https://x/y");
    expect(norm.skills.abs?.source).toBe("/abs/path");
  });
});
