import { describe, expect, it } from "bun:test";
import { classifyVendor, planVendor, staleLinkPaths } from "../src/domain/link";

const layout = {
  instruction: "/home/u/.claude/CLAUDE.md",
  skills: "/home/u/.claude/skills",
  agents: "/home/u/.claude/agents",
};

const plan = planVendor(
  layout,
  "/cfg/AGENTS.md",
  [{ name: "java", sourceDirectory: "/cfg/skills/java", files: [] }],
  [{ name: "team", sourceDirectory: "/cfg/subagents/team", files: ["a.md", "b.md"] }],
);

const actualFor = (plan: { links: readonly { path: string; target: string }[] }) =>
  new Map(plan.links.map(link => [link.path, link.target]));

describe("planVendor", () => {
  it("links the prompt, each skill directory and each subagent file", () => {
    expect(plan.links).toEqual([
      { path: "/home/u/.claude/CLAUDE.md", target: "/cfg/AGENTS.md" },
      { path: "/home/u/.claude/skills/java", target: "/cfg/skills/java" },
      { path: "/home/u/.claude/agents/a.md", target: "/cfg/subagents/team/a.md" },
      { path: "/home/u/.claude/agents/b.md", target: "/cfg/subagents/team/b.md" },
    ]);
  });
});

describe("staleLinkPaths", () => {
  it("reports links the config no longer asks for", () => {
    const actual = actualFor(plan);
    actual.set("/home/u/.claude/skills/dropped", "/cfg/skills/dropped");
    expect(staleLinkPaths(plan, actual)).toEqual(["/home/u/.claude/skills/dropped"]);
  });

  it("reports nothing when the links match", () => {
    expect(staleLinkPaths(plan, actualFor(plan))).toEqual([]);
  });
});

describe("classifyVendor", () => {
  it("is not synced when nothing is linked", () => {
    expect(classifyVendor(plan, new Map())).toBe("not synced");
  });

  it("is in sync when every link matches", () => {
    expect(classifyVendor(plan, actualFor(plan))).toBe("in sync");
  });

  it("has drifted when a link points elsewhere", () => {
    const actual = actualFor(plan);
    actual.set("/home/u/.claude/skills/java", "/somewhere/else");
    expect(classifyVendor(plan, actual)).toBe("drifted");
  });

  it("has drifted when a stale link remains", () => {
    const actual = actualFor(plan);
    actual.set("/home/u/.claude/agents/gone.md", "/cfg/subagents/team/gone.md");
    expect(classifyVendor(plan, actual)).toBe("drifted");
  });

  it("has drifted when a wanted link is missing", () => {
    const actual = actualFor(plan);
    actual.delete("/home/u/.claude/skills/java");
    expect(classifyVendor(plan, actual)).toBe("drifted");
  });
});
