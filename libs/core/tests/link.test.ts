import { describe, expect, it } from "bun:test";
import {
  buildVendorPlan,
  getProjectState,
  getStaleLinkPaths,
  getVendorState,
} from "@ponte/core";

const layout = {
  instruction: "/home/u/.claude/CLAUDE.md",
  skills: "/home/u/.claude/skills",
  agents: "/home/u/.claude/agents",
};

const plan = buildVendorPlan(
  layout,
  "/cfg/AGENTS.md",
  [{ name: "java", sourceDirectory: "/cfg/skills/java" }],
  [{ sourceDirectory: "/cfg/subagents/team", files: ["a.md", "b.md"] }],
);

const actualFor = (plan: {
  links: readonly { path: string; target: string }[];
}) => new Map(plan.links.map(link => [link.path, link.target]));

describe("buildVendorPlan", () => {
  it("links the prompt, each skill directory and each subagent file", () => {
    expect(plan.links).toEqual([
      { path: "/home/u/.claude/CLAUDE.md", target: "/cfg/AGENTS.md" },
      { path: "/home/u/.claude/skills/java", target: "/cfg/skills/java" },
      {
        path: "/home/u/.claude/agents/a.md",
        target: "/cfg/subagents/team/a.md",
      },
      {
        path: "/home/u/.claude/agents/b.md",
        target: "/cfg/subagents/team/b.md",
      },
    ]);
  });
});

describe("getStaleLinkPaths", () => {
  it("reports links the config no longer asks for", () => {
    const actual = actualFor(plan);
    actual.set("/home/u/.claude/skills/dropped", "/cfg/skills/dropped");
    expect(getStaleLinkPaths(plan, actual)).toEqual([
      "/home/u/.claude/skills/dropped",
    ]);
  });

  it("reports nothing when the links match", () => {
    expect(getStaleLinkPaths(plan, actualFor(plan))).toEqual([]);
  });
});

describe("getVendorState", () => {
  it("is not synced when nothing is linked", () => {
    expect(getVendorState(plan, new Map())).toBe("not synced");
  });

  it("is in sync when every link matches", () => {
    expect(getVendorState(plan, actualFor(plan))).toBe("in sync");
  });

  it("has drifted when a link points elsewhere", () => {
    const actual = actualFor(plan);
    actual.set("/home/u/.claude/skills/java", "/somewhere/else");
    expect(getVendorState(plan, actual)).toBe("drifted");
  });

  it("has drifted when a stale link remains", () => {
    const actual = actualFor(plan);
    actual.set("/home/u/.claude/agents/gone.md", "/cfg/subagents/team/gone.md");
    expect(getVendorState(plan, actual)).toBe("drifted");
  });

  it("has drifted when a wanted link is missing", () => {
    const actual = actualFor(plan);
    actual.delete("/home/u/.claude/skills/java");
    expect(getVendorState(plan, actual)).toBe("drifted");
  });
});

describe("getProjectState", () => {
  it("has drifted when a skill is still to vendor and links exist", () => {
    expect(getProjectState(plan, actualFor(plan), 1)).toBe("drifted");
  });

  it("reports not synced when nothing is linked yet", () => {
    expect(getProjectState(plan, new Map(), 1)).toBe("not synced");
  });

  it("falls back to the vendor state when nothing is pending", () => {
    expect(getProjectState(plan, actualFor(plan), 0)).toBe("in sync");
  });
});
