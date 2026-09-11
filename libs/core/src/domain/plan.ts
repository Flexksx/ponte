import { dirname, isAbsolute, join, relative } from "node:path";
import type { Link, ResolvedEntry } from "./link";
import type { ProjectLayout, ProjectSkillTarget } from "./project";
import type { VendorLayout } from "./vendor";

export type VendorPlan = {
  readonly links: readonly Link[];
  readonly ownedDirectories: readonly string[];
};

export type VendorState = "in sync" | "drifted" | "not synced" | "disabled";

const skillDirectoryLinks = (
  layout: VendorLayout,
  skills: readonly ResolvedEntry[],
): Link[] =>
  skills.map(skill => ({
    path: join(layout.skills, skill.name),
    target: skill.sourceDirectory,
  }));

const flattenedSubagentLinks = (
  layout: VendorLayout,
  subagents: readonly ResolvedEntry[],
): Link[] =>
  subagents.flatMap(subagent =>
    subagent.files.map(file => ({
      path: join(layout.agents, file),
      target: join(subagent.sourceDirectory, file),
    })),
  );

export const buildVendorPlan = (
  layout: VendorLayout,
  promptPath: string,
  skills: readonly ResolvedEntry[],
  subagents: readonly ResolvedEntry[],
): VendorPlan => ({
  links: [
    { path: layout.instruction, target: promptPath },
    ...skillDirectoryLinks(layout, skills),
    ...flattenedSubagentLinks(layout, subagents),
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
  if (actual.size === 0) return "not synced";
  const correct = plan.links.every(
    link => actual.get(link.path) === link.target,
  );
  return correct && getStaleLinkPaths(plan, actual).length === 0
    ? "in sync"
    : "drifted";
};

const isInsideProject = (root: string, path: string): boolean => {
  const inside = relative(root, path);
  return inside !== "" && !inside.startsWith("..") && !isAbsolute(inside);
};

const skillLinkTarget = (
  layout: ProjectLayout,
  linkPath: string,
  directory: string,
): string =>
  isInsideProject(layout.root, directory)
    ? relative(dirname(linkPath), directory)
    : directory;

const skillLink = (
  layout: ProjectLayout,
  baseDir: string,
  skill: ProjectSkillTarget,
): Link => {
  const path = join(baseDir, skill.name);
  return { path, target: skillLinkTarget(layout, path, skill.directory) };
};

export const buildProjectPlan = (
  layout: ProjectLayout,
  skills: readonly ProjectSkillTarget[],
): VendorPlan => {
  const allDirectories = [layout.skills, ...layout.vendorSkillDirectories];
  return {
    links: allDirectories.flatMap(dir =>
      skills.map(skill => skillLink(layout, dir, skill)),
    ),
    ownedDirectories: allDirectories,
  };
};

export const getEffectiveVendorState = (
  plan: VendorPlan,
  actual: ReadonlyMap<string, string>,
  enabled: boolean,
): VendorState => (enabled ? getVendorState(plan, actual) : "disabled");
