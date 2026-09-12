import {
  buildSkillRows,
  type Project,
  type ProjectSkillRow,
  type ReadProjectLock,
} from "@ponte/core";

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
    return buildSkillRows(project.config.skills, lock);
  };
