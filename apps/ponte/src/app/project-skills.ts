import {
  isGitSource,
  type ReadProjectLock,
  type SourceEntry,
} from "@ponte/core";
import type { Project } from "./find-project";

export type ProjectSkillRow = {
  readonly name: string;
  readonly entry: SourceEntry;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export type ListProjectSkills = (
  project: Project,
) => Promise<ProjectSkillRow[]>;

type ListProjectSkillsDeps = {
  readProjectLock: ReadProjectLock;
};

export const createListProjectSkills =
  (deps: ListProjectSkillsDeps): ListProjectSkills =>
  async project => {
    const lock = await deps.readProjectLock(project.layout);
    return Object.entries(project.config.skills).map(([name, entry]) => ({
      name,
      entry,
      vendored: isGitSource(entry.source),
      commit: lock.skills[name]?.commit ?? null,
    }));
  };
