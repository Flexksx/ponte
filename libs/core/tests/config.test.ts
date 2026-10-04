import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  buildPontePaths,
  type Config,
  isGitSource,
  parseSource,
  resolveConfigPaths,
  type SourceEntry,
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

describe("buildPontePaths", () => {
  it("places ponte under the home directory by default", () => {
    expect(buildPontePaths({ home: "/home/u" })).toEqual({
      config: join("/home/u", ".config", "ponte"),
      configFile: join("/home/u", ".config", "ponte", "config.toml"),
      overridePrompt: join(
        "/home/u",
        ".local",
        "share",
        "ponte",
        "instruction",
      ),
      sourceCache: join("/home/u", ".cache", "ponte", "sources"),
    });
  });

  it("follows the XDG base directories", () => {
    const paths = buildPontePaths({
      home: "/home/u",
      configHome: "/xdg/config",
      dataHome: "/xdg/data",
      cacheHome: "/xdg/cache",
    });
    expect(paths.configFile).toBe(join("/xdg/config", "ponte", "config.toml"));
    expect(paths.overridePrompt).toBe(
      join("/xdg/data", "ponte", "instruction"),
    );
    expect(paths.sourceCache).toBe(join("/xdg/cache", "ponte", "sources"));
  });

  it("ignores a relative XDG directory, as the XDG specification says", () => {
    expect(
      buildPontePaths({ home: "/home/u", configHome: "relative" }).config,
    ).toBe(join("/home/u", ".config", "ponte"));
  });
});
