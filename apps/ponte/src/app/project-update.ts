import {
  type DirectoriesDiffer,
  type DirectoryExists,
  err,
  isGitSource,
  type LockEntry,
  ok,
  type ProjectLayout,
  type ProjectLock,
  parseSource,
  type ReadProjectLock,
  type RemoveDirectory,
  type ResolveSource,
  type Result,
  type SourceEntry,
  vendoredSkillPath,
  type WriteProjectLock,
} from "@ponte/core";
import type { Project } from "./find-project";
import type { CopyVendorSkill } from "./project-resolve";

export type UpdatedSkill = {
  readonly name: string;
  readonly commit: string | null;
};

export type ProjectUpdateReport = {
  readonly root: string;
  readonly updated: readonly UpdatedSkill[];
};

type UpdateDeps = {
  readProjectLock: ReadProjectLock;
  writeProjectLock: WriteProjectLock;
  resolveSource: ResolveSource;
  copyVendorSkill: CopyVendorSkill;
  directoryExists: DirectoryExists;
  removeDirectory: RemoveDirectory;
  directoriesDiffer: DirectoriesDiffer;
};

type Target = readonly [string, SourceEntry];

const namedTarget = (
  project: Project,
  name: string,
): Result<Target, string> => {
  const entry = project.config.skills[name];
  if (entry === undefined) return err(`unknown project skill: ${name}`);
  if (!isGitSource(entry.source)) {
    return err(`${name} is a local skill, so there is nothing to update`);
  }
  return ok([name, entry]);
};

const updateTargets = (
  project: Project,
  name: string | undefined,
): Result<readonly Target[], string> => {
  if (name === undefined) {
    return ok(
      Object.entries(project.config.skills).filter(([, entry]) =>
        isGitSource(entry.source),
      ),
    );
  }
  const result = namedTarget(project, name);
  if (!result.ok) return result;
  return ok([result.value]);
};

export const createRunProjectUpdate = (deps: UpdateDeps) => {
  const isDirty = async (
    layout: ProjectLayout,
    lock: ProjectLock,
    [name, entry]: Target,
  ): Promise<boolean> => {
    const directory = vendoredSkillPath(layout, name);
    if (!(await deps.directoryExists(directory))) return false;
    const commit = lock.skills[name]?.commit;
    if (commit === undefined) return true;
    const pristine = await deps.resolveSource(
      parseSource(entry.source, commit, entry.subdir),
    );
    return deps.directoriesDiffer(pristine, directory);
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

  return async (
    project: Project,
    name: string | undefined,
    force: boolean,
  ): Promise<Result<ProjectUpdateReport, string>> => {
    const targetsResult = updateTargets(project, name);
    if (!targetsResult.ok) return targetsResult;
    const targets = targetsResult.value;

    const lock = await deps.readProjectLock(project.layout);
    if (!force) {
      const dirty = await dirtyTargets(project.layout, lock, targets);
      if (dirty.length > 0) {
        return err(
          `${dirty.join(", ")}: the vendored copy differs from its locked commit, or the lock entry is missing - commit the copy, or pass --force to overwrite it`,
        );
      }
    }
    const locked: Record<string, LockEntry> = { ...lock.skills };
    const updated: UpdatedSkill[] = [];
    for (const [skill, entry] of targets) {
      await deps.removeDirectory(vendoredSkillPath(project.layout, skill));
      const commit = await deps.copyVendorSkill(project.layout, skill, entry);
      if (commit !== null) locked[skill] = { commit };
      updated.push({ name: skill, commit });
    }
    await deps.writeProjectLock(project.layout, { skills: locked });
    return ok({ root: project.layout.root, updated });
  };
};
