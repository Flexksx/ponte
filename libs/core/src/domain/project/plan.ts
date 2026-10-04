import { dirname, isAbsolute, join, relative } from "node:path";
import type { LinkPlan, LinkState } from "../link";
import { getLinkState } from "../link";
import type { ProjectLayout, ProjectSkillTarget } from "./types";

export const getProjectState = (
  plan: LinkPlan,
  actual: ReadonlyMap<string, string>,
  pending: number,
): LinkState =>
  pending > 0 && actual.size > 0 ? "drifted" : getLinkState(plan, actual);

export const buildProjectPlan = (
  layout: ProjectLayout,
  skills: readonly ProjectSkillTarget[],
): LinkPlan => {
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
    ownedDirectories: [...allDirectories, ...layout.legacySkillDirectories],
  };
};
