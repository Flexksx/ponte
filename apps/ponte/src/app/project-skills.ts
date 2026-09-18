import {
  type Config,
  findLockedSkillName,
  isGitSource,
  type Project,
  type ProjectSkillRow,
  type ReadProjectLock,
} from "@ponte/core";
import type { SkillNames } from "./skill-name";

export type ListProjectSkills = (
  project: Project,
) => Promise<ProjectSkillRow[]>;

export type ListConfigSkills = (config: Config) => Promise<ProjectSkillRow[]>;

type ListProjectSkillsDeps = {
  readProjectLock: ReadProjectLock;
  skillNames: SkillNames;
};

type ListConfigSkillsDeps = {
  skillNames: SkillNames;
};

export const createListProjectSkills =
  (deps: ListProjectSkillsDeps): ListProjectSkills =>
  async project => {
    const lock = await deps.readProjectLock(project.layout);
    const rows: ProjectSkillRow[] = [];
    for (const entry of project.config.skills) {
      if (!isGitSource(entry.source)) {
        rows.push({
          name: await deps.skillNames.readOrNull(entry.source),
          entry,
          vendored: false,
          commit: null,
        });
        continue;
      }
      const name = findLockedSkillName(lock, entry);
      rows.push({
        name,
        entry,
        vendored: true,
        commit: name === null ? null : (lock.skills[name]?.commit ?? null),
      });
    }
    return rows;
  };

export const createListConfigSkills =
  (deps: ListConfigSkillsDeps): ListConfigSkills =>
  async config => {
    const rows: ProjectSkillRow[] = [];
    for (const entry of config.skills) {
      const git = isGitSource(entry.source);
      rows.push({
        name: git ? null : await deps.skillNames.readOrNull(entry.source),
        entry,
        vendored: git,
        commit: null,
      });
    }
    return rows;
  };
