import { dirname, isAbsolute, join, relative } from "node:path";
import type { LinkPlan, LinkState } from "../link";
import { getLinkState } from "../link";
import type { RepoLayout, RepoSkillTarget } from "./types";

export const getRepoState = (
  plan: LinkPlan,
  actual: ReadonlyMap<string, string>,
  pending: number,
): LinkState =>
  pending > 0 && actual.size > 0 ? "drifted" : getLinkState(plan, actual);

export const buildRepoPlan = (
  layout: RepoLayout,
  skills: readonly RepoSkillTarget[],
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
