import {
  buildUpdateTargets,
  createLockEntry,
  err,
  type LockEntry,
  ok,
  type Problem,
  parseSource,
  type Repo,
  type RepoFiles,
  type RepoLayout,
  type RepoLock,
  type RepoUpdateReport,
  type Result,
  type Sources,
  type UpdatedSkill,
  type UpdateTarget,
  type VendoredSkills,
  vendoredSkillPath,
} from "@ponte/core";
import type { FetchedSkill, FetchSkill, VendorSkill } from "./repo-resolve";

export type RunRepoUpdate = (
  repo: Repo,
  name: string | undefined,
  force: boolean,
) => Promise<Result<RepoUpdateReport, Problem>>;

type PlannedUpdate = {
  readonly target: UpdateTarget;
  readonly fetched: FetchedSkill;
};

type UpdateDeps = {
  repoFiles: RepoFiles;
  sources: Sources;
  fetchSkill: FetchSkill;
  vendorSkill: VendorSkill;
  vendoredSkills: VendoredSkills;
};

const updateTargets = (
  repo: Repo,
  lock: RepoLock,
  name: string | undefined,
): Result<readonly UpdateTarget[], Problem> => {
  const targets = buildUpdateTargets(repo.config, lock);
  if (name === undefined) {
    return ok(targets);
  }
  const target = targets.find(candidate => candidate.name === name);
  return target === undefined
    ? err({ kind: "unknown-vendored-skill", name })
    : ok([target]);
};

export const createRunRepoUpdate = (deps: UpdateDeps): RunRepoUpdate => {
  const isModified = async (
    layout: RepoLayout,
    lock: RepoLock,
    target: UpdateTarget,
  ): Promise<Result<boolean, Problem>> => {
    const directory = vendoredSkillPath(layout, target.name);
    if (!(await deps.vendoredSkills.exists(directory))) {
      return ok(false);
    }
    const commit = lock.skills[target.name]?.commit;
    if (commit === undefined) {
      return ok(true);
    }
    const pristine = await deps.sources.resolve(
      parseSource(target.entry.source, commit, target.entry.subdir),
    );
    return pristine.ok
      ? ok(
          await deps.vendoredSkills.differs(
            pristine.value.directory,
            directory,
          ),
        )
      : pristine;
  };

  const modifiedTargets = async (
    layout: RepoLayout,
    lock: RepoLock,
    targets: readonly UpdateTarget[],
  ): Promise<Result<string[], Problem>> => {
    const modified: string[] = [];
    for (const target of targets) {
      const changed = await isModified(layout, lock, target);
      if (!changed.ok) {
        return changed;
      }
      if (changed.value) {
        modified.push(target.name);
      }
    }
    return ok(modified);
  };

  const planUpdates = async (
    targets: readonly UpdateTarget[],
  ): Promise<Result<PlannedUpdate[], Problem>> => {
    const planned: PlannedUpdate[] = [];
    for (const target of targets) {
      const fetched = await deps.fetchSkill(target.entry);
      if (!fetched.ok) {
        return fetched;
      }
      if (fetched.value.name !== target.name) {
        return err({
          kind: "skill-renamed",
          name: target.name,
          declared: fetched.value.name,
        });
      }
      planned.push({ target, fetched: fetched.value });
    }
    return ok(planned);
  };

  return async (repo, name, force) => {
    const lock = await deps.repoFiles.readLock(repo.layout);
    if (!lock.ok) {
      return lock;
    }
    const targets = updateTargets(repo, lock.value, name);
    if (!targets.ok) {
      return targets;
    }

    if (!force) {
      const modified = await modifiedTargets(
        repo.layout,
        lock.value,
        targets.value,
      );
      if (!modified.ok) {
        return modified;
      }
      if (modified.value.length > 0) {
        return err({ kind: "modified-vendored-skills", names: modified.value });
      }
    }
    const planned = await planUpdates(targets.value);
    if (!planned.ok) {
      return planned;
    }
    const locked: Record<string, LockEntry> = { ...lock.value.skills };
    const updated: UpdatedSkill[] = [];
    for (const { target, fetched } of planned.value) {
      await deps.vendoredSkills.remove(
        vendoredSkillPath(repo.layout, target.name),
      );
      await deps.vendorSkill(repo.layout, fetched);
      if (fetched.commit !== null) {
        locked[target.name] = createLockEntry(target.entry, fetched.commit);
      }
      updated.push({ name: target.name, commit: fetched.commit });
    }
    await deps.repoFiles.writeLock(repo.layout, { skills: locked });
    return ok({ root: repo.layout.root, updated });
  };
};
