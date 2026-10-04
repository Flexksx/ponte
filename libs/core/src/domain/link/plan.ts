import { join } from "node:path";
import type { ResolvedSkill } from "../skill";
import type { VendorLayout } from "../vendor";
import type { LinkPlan, LinkState, ResolvedSubagent } from "./types";

export const buildVendorPlan = (
  layout: VendorLayout,
  promptPath: string,
  skills: readonly ResolvedSkill[],
  subagents: readonly ResolvedSubagent[],
): LinkPlan => ({
  links: [
    { path: layout.instruction, target: promptPath },
    ...skills.map(skill => ({
      path: join(layout.skills, skill.name),
      target: skill.sourceDirectory,
    })),
    ...subagents.flatMap(subagent =>
      subagent.files.map(file => ({
        path: join(layout.agents, file),
        target: join(subagent.sourceDirectory, file),
      })),
    ),
  ],
  ownedDirectories: [layout.skills, ...layout.legacySkills, layout.agents],
});

export const getStaleLinkPaths = (
  plan: LinkPlan,
  actual: ReadonlyMap<string, string>,
): string[] => {
  const wanted = new Set(plan.links.map(link => link.path));
  return [...actual.keys()].filter(path => !wanted.has(path));
};

export const getLinkState = (
  plan: LinkPlan,
  actual: ReadonlyMap<string, string>,
): LinkState => {
  if (actual.size === 0) {
    return "not synced";
  }
  const correct = plan.links.every(
    link => actual.get(link.path) === link.target,
  );
  return correct && getStaleLinkPaths(plan, actual).length === 0
    ? "in sync"
    : "drifted";
};
