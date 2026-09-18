import { dirname, isAbsolute, join, relative } from "node:path";
import type { Link, ResolvedSkill, ResolvedSubagent } from "./link";
import type { ProjectLayout, ProjectSkillTarget } from "./project";
import type { VendorLayout } from "./vendor";

export type VendorPlan = {
  readonly links: readonly Link[];
  readonly ownedDirectories: readonly string[];
};

export type VendorState = "in sync" | "drifted" | "not synced" | "disabled";

export const buildVendorPlan = (
  layout: VendorLayout,
  promptPath: string,
  skills: readonly ResolvedSkill[],
  subagents: readonly ResolvedSubagent[],
): VendorPlan => ({
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
  ownedDirectories: [layout.skills, layout.agents],
});

export const getStaleLinkPaths = (
  plan: VendorPlan,
  actual: ReadonlyMap<string, string>,
): string[] => {
  const wanted = new Set(plan.links.map(link => link.path));
  return [...actual.keys()].filter(path => !wanted.has(path));
};

export const getVendorState = (
  plan: VendorPlan,
  actual: ReadonlyMap<string, string>,
): VendorState => {
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

export const getProjectState = (
  plan: VendorPlan,
  actual: ReadonlyMap<string, string>,
  pending: number,
): VendorState =>
  pending > 0 && actual.size > 0 ? "drifted" : getVendorState(plan, actual);

export const buildProjectPlan = (
  layout: ProjectLayout,
  skills: readonly ProjectSkillTarget[],
): VendorPlan => {
  const allDirectories = [layout.skills, ...layout.vendorSkillDirectories];
  return {
    links: allDirectories.flatMap(dir =>
      skills.map(skill => {
        const linkPath = join(dir, skill.name);
        const rel = relative(layout.root, skill.directory);
        const isInside =
          rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
        return {
          path: linkPath,
          target: isInside
            ? relative(dirname(linkPath), skill.directory)
            : skill.directory,
        };
      }),
    ),
    ownedDirectories: allDirectories,
  };
};
