import type { SourceEntry } from "../domain/config";
import type { VendorPlan, VendorState } from "../domain/link";
import {
  type LockEntry,
  lockEntry,
  lockEquals,
  lockedSkillName,
  PROJECT_CONFIG_FILE,
  type ProjectConfig,
  type ProjectLayout,
  type ProjectLock,
  planProject,
  projectLayout,
  projectState,
  vendoredSkillPath,
} from "../domain/project";
import { type NamedSkill, requireUniqueSkillNames } from "../domain/skill";
import { isGitSource, parseSource } from "../domain/source";
import { copyDirectoryWithoutGit, directoryExists } from "../infra/filesystem";
import { resolveSource, resolveSourceDetails } from "../infra/git";
import { readSymlinks } from "../infra/links";
import { currentDirectory, gitCacheDirectoryPath } from "../infra/paths";
import { findProjectRoot, readProjectConfig, readProjectLock } from "../infra/project-file";
import { checkVendoredSkillName, readSkillName, readSkillNameOrNull, sourceOf } from "./skills";

export type Project = { readonly layout: ProjectLayout; readonly config: ProjectConfig };

export type ProjectSkill = {
  readonly name: string;
  readonly directory: string;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export type FetchedSkill = {
  readonly name: string;
  readonly directory: string;
  readonly commit: string | null;
};

type MatchedSkill = { readonly skill: ProjectSkill; readonly locked: LockEntry };

export type ProjectResolution = {
  readonly skills: readonly ProjectSkill[];
  readonly plan: VendorPlan;
  readonly lock: ProjectLock;
  readonly lockChanged: boolean;
  readonly pending: number;
};

export type ProjectSkillRow = {
  readonly name: string | null;
  readonly entry: SourceEntry;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export type ProjectStatusReport = {
  readonly root: string;
  readonly skillsDirectory: string;
  readonly linkCount: number;
  readonly state: VendorState;
};

export class NotInProjectError extends Error {
  constructor() {
    super(`no ${PROJECT_CONFIG_FILE} in this directory or any parent directory`);
  }
}

export const findProject = async (): Promise<Project | null> => {
  const root = await findProjectRoot(currentDirectory());
  if (root === null) return null;
  return { layout: projectLayout(root), config: await readProjectConfig(root) };
};

export const requireProject = async (): Promise<Project> => {
  const project = await findProject();
  if (project === null) throw new NotInProjectError();
  return project;
};

const localSkillDirectory = (entry: SourceEntry): Promise<string> =>
  resolveSource(parseSource(entry.source, entry.ref, entry.subdir), gitCacheDirectoryPath());

export const fetchSkill = async (entry: SourceEntry): Promise<FetchedSkill> => {
  const resolved = await resolveSourceDetails(
    parseSource(entry.source, entry.ref, entry.subdir),
    gitCacheDirectoryPath(),
  );
  return {
    name: await readSkillName(sourceOf(entry), resolved.directory),
    directory: resolved.directory,
    commit: resolved.commit,
  };
};

export const vendorSkill = (layout: ProjectLayout, fetched: FetchedSkill): Promise<void> =>
  copyDirectoryWithoutGit(fetched.directory, vendoredSkillPath(layout, fetched.name));

const matchedVendoredSkill = async (
  layout: ProjectLayout,
  lock: ProjectLock,
  entry: SourceEntry,
  source: string,
): Promise<MatchedSkill | null> => {
  const name = lockedSkillName(lock, entry);
  if (name === null) return null;
  const locked = lock.skills[name];
  if (locked === undefined) return null;
  const directory = vendoredSkillPath(layout, name);
  if (!(await directoryExists(directory))) return null;
  await checkVendoredSkillName(source, directory);
  return { skill: { name, directory, vendored: true, commit: locked.commit }, locked };
};

const vendoredSkill = async (layout: ProjectLayout, entry: SourceEntry): Promise<ProjectSkill> => {
  const fetched = await fetchSkill(entry);
  const directory = vendoredSkillPath(layout, fetched.name);
  if (await directoryExists(directory)) await checkVendoredSkillName(sourceOf(entry), directory);
  else await vendorSkill(layout, fetched);
  return { name: fetched.name, directory, vendored: true, commit: fetched.commit };
};

export const resolveProject = async (
  project: Project,
  materialize: boolean,
): Promise<ProjectResolution> => {
  const lock = await readProjectLock(project.layout);
  const locked: Record<string, LockEntry> = {};
  const skills: ProjectSkill[] = [];
  const named: NamedSkill[] = [];
  let pending = 0;
  for (const entry of project.config.skills) {
    const source = sourceOf(entry);
    if (!isGitSource(entry.source)) {
      const directory = await localSkillDirectory(entry);
      const name = await readSkillName(source, directory);
      skills.push({ name, directory, vendored: false, commit: null });
      named.push({ name, source });
      continue;
    }
    const matched = await matchedVendoredSkill(project.layout, lock, entry, source);
    if (matched !== null) {
      locked[matched.skill.name] = matched.locked;
      skills.push(matched.skill);
      named.push({ name: matched.skill.name, source });
      continue;
    }
    pending += 1;
    if (!materialize) continue;
    const skill = await vendoredSkill(project.layout, entry);
    if (skill.commit !== null) locked[skill.name] = lockEntry(entry, skill.commit);
    skills.push(skill);
    named.push({ name: skill.name, source });
  }
  requireUniqueSkillNames(named);
  const next: ProjectLock = { skills: materialize ? locked : lock.skills };
  return {
    skills,
    plan: planProject(project.layout, skills),
    lock: next,
    lockChanged: materialize && !lockEquals(lock, next),
    pending,
  };
};

export const listProjectSkills = async (project: Project): Promise<ProjectSkillRow[]> => {
  const lock = await readProjectLock(project.layout);
  const rows: ProjectSkillRow[] = [];
  for (const entry of project.config.skills) {
    if (!isGitSource(entry.source)) {
      rows.push({
        name: await readSkillNameOrNull(entry.source),
        entry,
        vendored: false,
        commit: null,
      });
      continue;
    }
    const name = lockedSkillName(lock, entry);
    rows.push({
      name,
      entry,
      vendored: true,
      commit: name === null ? null : (lock.skills[name]?.commit ?? null),
    });
  }
  return rows;
};

export const readProjectStatus = async (project: Project): Promise<ProjectStatusReport> => {
  const { plan, pending } = await resolveProject(project, false);
  const actual = await readSymlinks(plan);
  return {
    root: project.layout.root,
    skillsDirectory: project.layout.skills,
    linkCount: actual.size,
    state: projectState(plan, actual, pending),
  };
};
