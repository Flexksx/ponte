import type { SourceEntry } from "../domain/config";
import { classifyVendor, type VendorPlan, type VendorState } from "../domain/link";
import {
  type LockEntry,
  PROJECT_CONFIG_FILE,
  type ProjectConfig,
  type ProjectLayout,
  type ProjectLock,
  planProject,
  projectLayout,
  vendoredSkillPath,
} from "../domain/project";
import { isGitSource, parseSource } from "../domain/source";
import { copyDirectoryWithoutGit, directoryExists } from "../infra/filesystem";
import { resolveSource, resolveSourceDetails } from "../infra/git";
import { readSymlinks } from "../infra/links";
import { currentDirectory, gitCacheDirectoryPath } from "../infra/paths";
import { findProjectRoot, readProjectConfig, readProjectLock } from "../infra/project-file";

export type Project = { readonly layout: ProjectLayout; readonly config: ProjectConfig };

export type ProjectSkill = {
  readonly name: string;
  readonly directory: string;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export type ProjectResolution = {
  readonly skills: readonly ProjectSkill[];
  readonly plan: VendorPlan;
  readonly lock: ProjectLock;
  readonly vendored: readonly string[];
};

export type ProjectSkillRow = {
  readonly name: string;
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

export const vendorSkill = async (
  layout: ProjectLayout,
  name: string,
  entry: SourceEntry,
): Promise<string | null> => {
  const resolved = await resolveSourceDetails(
    parseSource(entry.source, entry.ref, entry.subdir),
    gitCacheDirectoryPath(),
  );
  await copyDirectoryWithoutGit(resolved.directory, vendoredSkillPath(layout, name));
  return resolved.commit;
};

const localSkillDirectory = (entry: SourceEntry): Promise<string> =>
  resolveSource(parseSource(entry.source, entry.ref, entry.subdir), gitCacheDirectoryPath());

export const resolveProject = async (
  project: Project,
  materialize: boolean,
): Promise<ProjectResolution> => {
  const locked: Record<string, LockEntry> = { ...(await readProjectLock(project.layout)).skills };
  const skills: ProjectSkill[] = [];
  const vendored: string[] = [];
  for (const [name, entry] of Object.entries(project.config.skills)) {
    if (!isGitSource(entry.source)) {
      const directory = await localSkillDirectory(entry);
      skills.push({ name, directory, vendored: false, commit: null });
      continue;
    }
    const directory = vendoredSkillPath(project.layout, name);
    if (!(await directoryExists(directory))) {
      vendored.push(name);
      if (materialize) {
        const commit = await vendorSkill(project.layout, name, entry);
        if (commit !== null) locked[name] = { commit };
      }
    }
    skills.push({ name, directory, vendored: true, commit: locked[name]?.commit ?? null });
  }
  return {
    skills,
    plan: planProject(project.layout, skills),
    lock: { skills: locked },
    vendored,
  };
};

export const listProjectSkills = async (project: Project): Promise<ProjectSkillRow[]> => {
  const lock = await readProjectLock(project.layout);
  return Object.entries(project.config.skills).map(([name, entry]) => ({
    name,
    entry,
    vendored: isGitSource(entry.source),
    commit: lock.skills[name]?.commit ?? null,
  }));
};

export const readProjectStatus = async (project: Project): Promise<ProjectStatusReport> => {
  const { plan } = await resolveProject(project, false);
  const actual = await readSymlinks(plan);
  return {
    root: project.layout.root,
    skillsDirectory: project.layout.skills,
    linkCount: actual.size,
    state: classifyVendor(plan, actual),
  };
};
