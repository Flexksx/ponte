import { join } from "node:path";
import { type SourceEntry, sourceKey } from "../domain/config";
import {
  type LockEntry,
  lockEntry,
  PROJECT_SOURCES_DIRECTORY,
  type ProjectLayout,
  type ProjectLock,
  vendoredSkillPath,
} from "../domain/project";
import { parseSource } from "../domain/source";
import { directoriesDiffer, directoryExists, removeDirectory } from "../infra/filesystem";
import { resolveSource } from "../infra/git";
import { gitCacheDirectoryPath } from "../infra/paths";
import { readProjectLock, writeProjectLock } from "../infra/project-file";
import { type FetchedSkill, fetchSkill, type Project, vendorSkill } from "./project";

export type UpdatedSkill = { readonly name: string; readonly commit: string | null };

export type ProjectUpdateReport = {
  readonly root: string;
  readonly updated: readonly UpdatedSkill[];
};

type Target = { readonly name: string; readonly entry: SourceEntry };

type PlannedUpdate = { readonly target: Target; readonly fetched: FetchedSkill };

export class UnknownProjectSkillError extends Error {
  constructor(name: string) {
    super(
      `unknown vendored skill: ${name} - ponte update works on the git skills that ponte.toml declares and ${PROJECT_SOURCES_DIRECTORY} holds`,
    );
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

export class SkillRenamedError extends Error {
  constructor(name: string, declared: string) {
    super(
      `${name}: the source now declares the name "${declared}" - run ponte sync to vendor the skill under the new name, then delete ${join(PROJECT_SOURCES_DIRECTORY, name)} by hand`,
    );
  }
}

const updateTargets = (
  project: Project,
  lock: ProjectLock,
  name: string | undefined,
): readonly Target[] => {
  const targets: Target[] = [];
  for (const [locked, entry] of Object.entries(lock.skills)) {
    const match = project.config.skills.find(
      candidate => sourceKey(candidate) === sourceKey(entry),
    );
    if (match !== undefined) targets.push({ name: locked, entry: match });
  }
  if (name === undefined) return targets;
  const target = targets.find(candidate => candidate.name === name);
  if (target === undefined) throw new UnknownProjectSkillError(name);
  return [target];
};

const isDirty = async (
  layout: ProjectLayout,
  lock: ProjectLock,
  target: Target,
): Promise<boolean> => {
  const directory = vendoredSkillPath(layout, target.name);
  if (!(await directoryExists(directory))) return false;
  const commit = lock.skills[target.name]?.commit;
  if (commit === undefined) return true;
  const pristine = await resolveSource(
    parseSource(target.entry.source, commit, target.entry.subdir),
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
    if (await isDirty(layout, lock, target)) dirty.push(target.name);
  }
  return dirty;
};

const planUpdates = async (targets: readonly Target[]): Promise<PlannedUpdate[]> => {
  const planned: PlannedUpdate[] = [];
  for (const target of targets) {
    const fetched = await fetchSkill(target.entry);
    if (fetched.name !== target.name) throw new SkillRenamedError(target.name, fetched.name);
    planned.push({ target, fetched });
  }
  return planned;
};

export const runProjectUpdate = async (
  project: Project,
  name: string | undefined,
  force: boolean,
): Promise<ProjectUpdateReport> => {
  const lock = await readProjectLock(project.layout);
  const targets = updateTargets(project, lock, name);
  if (!force) {
    const dirty = await dirtyTargets(project.layout, lock, targets);
    if (dirty.length > 0) throw new DirtyProjectSkillsError(dirty);
  }
  const planned = await planUpdates(targets);
  const locked: Record<string, LockEntry> = { ...lock.skills };
  const updated: UpdatedSkill[] = [];
  for (const { target, fetched } of planned) {
    await removeDirectory(vendoredSkillPath(project.layout, target.name));
    await vendorSkill(project.layout, fetched);
    if (fetched.commit !== null) locked[target.name] = lockEntry(target.entry, fetched.commit);
    updated.push({ name: target.name, commit: fetched.commit });
  }
  await writeProjectLock(project.layout, { skills: locked });
  return { root: project.layout.root, updated };
};
