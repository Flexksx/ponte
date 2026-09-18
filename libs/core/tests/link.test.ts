import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  buildVendorPlan,
  getProjectState,
  getStaleLinkPaths,
  getVendorState,
} from "@ponte/core";

const VENDOR_ROOT = join("/home/u", ".claude");
const CONFIG_ROOT = "/cfg";
const SUBAGENTS = join(CONFIG_ROOT, "subagents", "team");

const layout = {
  instruction: join(VENDOR_ROOT, "CLAUDE.md"),
  skills: join(VENDOR_ROOT, "skills"),
  agents: join(VENDOR_ROOT, "agents"),
};

const plan = buildVendorPlan(
  layout,
  join(CONFIG_ROOT, "AGENTS.md"),
  [{ name: "java", sourceDirectory: join(CONFIG_ROOT, "skills", "java") }],
  [{ sourceDirectory: SUBAGENTS, files: ["a.md", "b.md"] }],
);

const actualFor = (plan: {
  links: readonly { path: string; target: string }[];
}) => new Map(plan.links.map(link => [link.path, link.target]));

describe("buildVendorPlan", () => {
  it("links the prompt, each skill directory and each subagent file", () => {
    expect(plan.links).toEqual([
      {
        path: join(VENDOR_ROOT, "CLAUDE.md"),
        target: join(CONFIG_ROOT, "AGENTS.md"),
      },
      {
        path: join(VENDOR_ROOT, "skills", "java"),
        target: join(CONFIG_ROOT, "skills", "java"),
      },
      {
        path: join(VENDOR_ROOT, "agents", "a.md"),
        target: join(SUBAGENTS, "a.md"),
      },
      {
        path: join(VENDOR_ROOT, "agents", "b.md"),
        target: join(SUBAGENTS, "b.md"),
      },
    ]);
  });
});

describe("getStaleLinkPaths", () => {
  it("reports links the config no longer asks for", () => {
    const actual = actualFor(plan);
    actual.set(
      join(VENDOR_ROOT, "skills", "dropped"),
      join(CONFIG_ROOT, "skills", "dropped"),
    );
    expect(getStaleLinkPaths(plan, actual)).toEqual([
      join(VENDOR_ROOT, "skills", "dropped"),
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
    actual.set(join(VENDOR_ROOT, "skills", "java"), "/somewhere/else");
    expect(getVendorState(plan, actual)).toBe("drifted");
  });

  it("has drifted when a stale link remains", () => {
    const actual = actualFor(plan);
    actual.set(
      join(VENDOR_ROOT, "agents", "gone.md"),
      join(SUBAGENTS, "gone.md"),
    );
    expect(getVendorState(plan, actual)).toBe("drifted");
  });

  it("has drifted when a wanted link is missing", () => {
    const actual = actualFor(plan);
    actual.delete(join(VENDOR_ROOT, "skills", "java"));
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
