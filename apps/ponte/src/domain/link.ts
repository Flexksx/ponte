import { join } from "node:path";
import type { VendorLayout } from "./vendor";

export type Link = { readonly path: string; readonly target: string };

export type ResolvedEntry = {
  readonly name: string;
  readonly sourceDirectory: string;
  readonly files: readonly string[];
};

export type VendorPlan = {
  readonly links: readonly Link[];
  readonly ownedDirectories: readonly string[];
};

export type VendorState = "in sync" | "drifted" | "not synced" | "disabled";

const skillDirectoryLinks = (layout: VendorLayout, skills: readonly ResolvedEntry[]): Link[] =>
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

export const planVendor = (
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

export const staleLinkPaths = (plan: VendorPlan, actual: ReadonlyMap<string, string>): string[] => {
  const wanted = new Set(plan.links.map(link => link.path));
  return [...actual.keys()].filter(path => !wanted.has(path));
};

export const classifyVendor = (
  plan: VendorPlan,
  actual: ReadonlyMap<string, string>,
): VendorState => {
  if (actual.size === 0) return "not synced";
  const correct = plan.links.every(link => actual.get(link.path) === link.target);
  return correct && staleLinkPaths(plan, actual).length === 0 ? "in sync" : "drifted";
};
