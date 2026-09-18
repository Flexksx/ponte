import {
  buildUpdateTargets,
  createLockEntry,
  type DirectoriesDiffer,
  type DirectoryExists,
  err,
  type LockEntry,
  ok,
  PROJECT_CONFIG_FILE,
  PROJECT_SOURCES_DIRECTORY,
  type Project,
  type ProjectLayout,
  type ProjectLock,
  parseSource,
  type ReadProjectLock,
  type RemoveDirectory,
  type ResolveSource,
  type Result,
  SkillRenamedError,
  type UpdateTarget,
  vendoredSkillPath,
  type WriteProjectLock,
} from "@ponte/core";
import {
  type FetchedSkill,
  type FetchSkill,
  vendorSkill,
} from "./project-resolve";

export type UpdatedSkill = {
  readonly name: string;
  readonly commit: string | null;
};

export type ProjectUpdateReport = {
  readonly root: string;
  readonly updated: readonly UpdatedSkill[];
};

type PlannedUpdate = {
  readonly target: UpdateTarget;
  readonly fetched: FetchedSkill;
};

type UpdateDeps = {
  readProjectLock: ReadProjectLock;
  writeProjectLock: WriteProjectLock;
  resolveSource: ResolveSource;
  fetchSkill: FetchSkill;
  directoryExists: DirectoryExists;
  removeDirectory: RemoveDirectory;
  directoriesDiffer: DirectoriesDiffer;
};

const updateTargets = (
  project: Project,
  lock: ProjectLock,
  name: string | undefined,
): Result<readonly UpdateTarget[], string> => {
  const targets = buildUpdateTargets(project.config, lock);
  if (name === undefined) {
    return ok(targets);
  }
  const target = targets.find(candidate => candidate.name === name);
  if (target === undefined) {
    return err(
      `unknown vendored skill: ${name} - ponte update works on the git skills that ${PROJECT_CONFIG_FILE} declares and ${PROJECT_SOURCES_DIRECTORY} holds`,
    );
  }
  return ok([target]);
};

export const createRunProjectUpdate = (deps: UpdateDeps) => {
  const isDirty = async (
    layout: ProjectLayout,
    lock: ProjectLock,
    target: UpdateTarget,
  ): Promise<boolean> => {
    const directory = vendoredSkillPath(layout, target.name);
    if (!(await deps.directoryExists(directory))) {
      return false;
    }
    const commit = lock.skills[target.name]?.commit;
    if (commit === undefined) {
      return true;
    }
    const pristine = await deps.resolveSource(
      parseSource(target.entry.source, commit, target.entry.subdir),
    );
    return deps.directoriesDiffer(pristine, directory);
  };

  const dirtyTargets = async (
    layout: ProjectLayout,
    lock: ProjectLock,
    targets: readonly UpdateTarget[],
  ): Promise<string[]> => {
    const dirty: string[] = [];
    for (const target of targets) {
      if (await isDirty(layout, lock, target)) {
        dirty.push(target.name);
      }
    }
    return dirty;
  };

  const planUpdates = async (
    targets: readonly UpdateTarget[],
  ): Promise<PlannedUpdate[]> => {
    const planned: PlannedUpdate[] = [];
    for (const target of targets) {
      const fetched = await deps.fetchSkill(target.entry);
      if (fetched.name !== target.name) {
        throw new SkillRenamedError(target.name, fetched.name);
      }
      planned.push({ target, fetched });
    }
    return planned;
  };

  return async (
    project: Project,
    name: string | undefined,
    force: boolean,
  ): Promise<Result<ProjectUpdateReport, string>> => {
    const lock = await deps.readProjectLock(project.layout);
    const targetsResult = updateTargets(project, lock, name);
    if (!targetsResult.ok) {
      return targetsResult;
    }
    const targets = targetsResult.value;

    if (!force) {
      const dirty = await dirtyTargets(project.layout, lock, targets);
      if (dirty.length > 0) {
        return err(
          `${dirty.join(", ")}: the vendored copy differs from its locked commit, or the lock entry is missing - commit the copy, or pass --force to overwrite it`,
        );
      }
    }
    const planned = await planUpdates(targets);
    const locked: Record<string, LockEntry> = { ...lock.skills };
    const updated: UpdatedSkill[] = [];
    for (const { target, fetched } of planned) {
      await deps.removeDirectory(
        vendoredSkillPath(project.layout, target.name),
      );
      await vendorSkill(project.layout, fetched);
      if (fetched.commit !== null) {
        locked[target.name] = createLockEntry(target.entry, fetched.commit);
      }
      updated.push({ name: target.name, commit: fetched.commit });
    }
    await deps.writeProjectLock(project.layout, { skills: locked });
    return ok({ root: project.layout.root, updated });
  };
};
