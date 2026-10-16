import {
  type Config,
  findLockedSkillName,
  isGitSource,
  ok,
  type Problem,
  type Repo,
  type RepoFiles,
  type Result,
  resolveConfigPaths,
  type SkillRow,
} from "@ponte/core";
import type { SkillNames } from "./skill-name";

export type ListConfigSkills = (config: Config) => Promise<SkillRow[]>;

export type ListRepoSkills = (
  repo: Repo,
) => Promise<Result<SkillRow[], Problem>>;

type ListConfigSkillsDeps = {
  skillNames: SkillNames;
  configDirectory: string;
};

type ListRepoSkillsDeps = {
  repoFiles: RepoFiles;
  skillNames: SkillNames;
};

export const createListConfigSkills =
  (deps: ListConfigSkillsDeps): ListConfigSkills =>
  config => {
    const resolved = resolveConfigPaths(config, deps.configDirectory).skills;
    return Promise.all(
      config.skills.map(async (entry, index) => {
        const git = isGitSource(entry.source);
        const directory = resolved[index]?.source ?? entry.source;
        return {
          name: git ? null : await deps.skillNames.readOrNull(directory),
          entry,
          vendored: git,
          commit: null,
        };
      }),
    );
  };

export const createListRepoSkills =
  (deps: ListRepoSkillsDeps): ListRepoSkills =>
  async repo => {
    const lock = await deps.repoFiles.readLock(repo.layout);
    if (!lock.ok) {
      return lock;
    }
    const rows: SkillRow[] = [];
    for (const entry of repo.config.skills) {
      if (!isGitSource(entry.source)) {
        rows.push({
          name: await deps.skillNames.readOrNull(entry.source),
          entry,
          vendored: false,
          commit: null,
        });
        continue;
      }
      const name = findLockedSkillName(lock.value, entry);
      rows.push({
        name,
        entry,
        vendored: true,
        commit:
          name === null ? null : (lock.value.skills[name]?.commit ?? null),
      });
    }
    return ok(rows);
  };
