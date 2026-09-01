import type { SourceEntry } from "../domain/config";
import {
  type LockEntry,
  type ProjectLayout,
  type ProjectLock,
  vendoredSkillPath,
} from "../domain/project";
import { isGitSource, parseSource } from "../domain/source";
import { directoriesDiffer, directoryExists, removeDirectory } from "../infra/filesystem";
import { resolveSource } from "../infra/git";
import { gitCacheDirectoryPath } from "../infra/paths";
import { readProjectLock, writeProjectLock } from "../infra/project-file";
import { type Project, vendorSkill } from "./project";

export type UpdatedSkill = { readonly name: string; readonly commit: string | null };

export type ProjectUpdateReport = {
  readonly root: string;
  readonly updated: readonly UpdatedSkill[];
};

type Target = readonly [string, SourceEntry];

export class UnknownProjectSkillError extends Error {
  constructor(name: string) {
    super(`unknown project skill: ${name}`);
  }
}

export class LocalProjectSkillError extends Error {
  constructor(name: string) {
    super(`${name} is a local skill, so there is nothing to update`);
  }
}

export class DirtyProjectSkillsError extends Error {
  readonly names: readonly string[];
  constructor(names: readonly string[]) {
    super(
      `${names.join(", ")}: the vendored copy differs from its locked commit, or the lock entry is missing - commit the copy, or pass --force to overwrite it`,
    );
    this.names = names;
  }
}

const namedTarget = (project: Project, name: string): Target => {
  const entry = project.config.skills[name];
  if (entry === undefined) throw new UnknownProjectSkillError(name);
  if (!isGitSource(entry.source)) throw new LocalProjectSkillError(name);
  return [name, entry];
};

const updateTargets = (project: Project, name: string | undefined): readonly Target[] =>
  name === undefined
    ? Object.entries(project.config.skills).filter(([, entry]) => isGitSource(entry.source))
    : [namedTarget(project, name)];

const isDirty = async (
  layout: ProjectLayout,
  lock: ProjectLock,
  [name, entry]: Target,
): Promise<boolean> => {
  const directory = vendoredSkillPath(layout, name);
  if (!(await directoryExists(directory))) return false;
  const commit = lock.skills[name]?.commit;
  if (commit === undefined) return true;
  const pristine = await resolveSource(
    parseSource(entry.source, commit, entry.subdir),
    gitCacheDirectoryPath(),
  );
  return directoriesDiffer(pristine, directory);
};

const dirtyTargets = async (
  layout: ProjectLayout,
  lock: ProjectLock,
  targets: readonly Target[],
): Promise<string[]> => {
  const dirty: string[] = [];
  for (const target of targets) {
    if (await isDirty(layout, lock, target)) dirty.push(target[0]);
  }
  return dirty;
};

export const runProjectUpdate = async (
  project: Project,
  name: string | undefined,
  force: boolean,
): Promise<ProjectUpdateReport> => {
  const targets = updateTargets(project, name);
  const lock = await readProjectLock(project.layout);
  if (!force) {
    const dirty = await dirtyTargets(project.layout, lock, targets);
    if (dirty.length > 0) throw new DirtyProjectSkillsError(dirty);
  }
  const locked: Record<string, LockEntry> = { ...lock.skills };
  const updated: UpdatedSkill[] = [];
  for (const [skill, entry] of targets) {
    await removeDirectory(vendoredSkillPath(project.layout, skill));
    const commit = await vendorSkill(project.layout, skill, entry);
    if (commit !== null) locked[skill] = { commit };
    updated.push({ name: skill, commit });
  }
  await writeProjectLock(project.layout, { skills: locked });
  return { root: project.layout.root, updated };
};
