import { describe, expect, it } from "bun:test";
import { decodeConfig, encodeConfig } from "../src/infra/config-codec";
import { decoded, issuesOf, issueText } from "./codec-helpers";

describe("decodeConfig", () => {
  const base = {
    system_prompt_file: "AGENTS.md",
    vendors: { "claude-code": { enabled: true } },
  };

  it("decodes a valid config", () => {
    const cfg = decoded(decodeConfig(base));
    expect(cfg.systemPromptFile).toBe("AGENTS.md");
    expect(cfg.vendors["claude-code"]?.enabled).toBe(true);
  });

  it("defaults systemPromptFile when omitted", () => {
    const cfg = decoded(decodeConfig({ vendors: {} }));
    expect(cfg.systemPromptFile).toBe("AGENTS.md");
  });

  it("decodes skills and subagents as ordered arrays", () => {
    const cfg = decoded(
      decodeConfig({
        ...base,
        skills: [
          { source: "skills/a" },
          { source: "https://x/y", ref: "abc", subdir: "sub" },
        ],
        subagents: [{ source: "subagents/claude" }],
      }),
    );
    expect(cfg.skills).toEqual([
      { source: "skills/a" },
      { source: "https://x/y", ref: "abc", subdir: "sub" },
    ]);
    expect(cfg.subagents).toEqual([{ source: "subagents/claude" }]);
  });

  it("defaults skills and subagents to empty arrays", () => {
    const cfg = decoded(decodeConfig(base));
    expect(cfg.skills).toEqual([]);
    expect(cfg.subagents).toEqual([]);
  });

  it("rejects an unknown agent name", () => {
    const issues = issuesOf(
      decodeConfig({ vendors: { claude_code: { enabled: true } } }),
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it("tells a named skill table how to migrate", () => {
    const issues = issuesOf(
      decodeConfig({ ...base, skills: { mine: { source: "skills/mine" } } }),
    );
    expect(issues.length).toBeGreaterThan(0);
    const message = issueText(issues);
    expect(message).toContain("[[skills]]");
    expect(message).toContain("SKILL.md");
  });

  it("tells a named subagent table how to migrate", () => {
    const issues = issuesOf(
      decodeConfig({ ...base, subagents: { claude: { source: "s" } } }),
    );
    expect(issues.length).toBeGreaterThan(0);
    const message = issueText(issues);
    expect(message).toContain("[[subagents]]");
    expect(message).toContain("after its file");
  });

  it("reports the index of a bad entry", () => {
    const issues = issuesOf(
      decodeConfig({ ...base, skills: [{ source: "ok" }, { ref: "abc" }] }),
    );
    expect(issueText(issues)).toContain("skills[1].source");
  });

  it("reports every problem at once", () => {
    const bad = {
      system_prompt_file: 123,
      vendors: "nope",
      skills: [{ source: 42 }],
    };
    const issues = issuesOf(decodeConfig(bad));
    expect(issues.length).toBeGreaterThan(0);
    const problems = issues;
    expect(problems.length).toBeGreaterThan(1);
  });
});

describe("encodeConfig", () => {
  it("round-trips skills and subagents through array-of-table sections", () => {
    const config = decoded(
      decodeConfig({
        system_prompt_file: "AGENTS.md",
        vendors: { "claude-code": { enabled: true } },
        skills: [{ source: "https://x/y", ref: "abc", subdir: "sub" }],
        subagents: [{ source: "subagents/claude" }],
      }),
    );
    const encoded = encodeConfig(config);
    expect(encoded).toContain("[[skills]]");
    expect(encoded).toContain("[[subagents]]");
    expect(decoded(decodeConfig(Bun.TOML.parse(encoded)))).toEqual(config);
  });
});
