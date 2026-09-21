import {
  buildProjectPlan,
  type CopyDirectoryWithoutGit,
  createLockEntry,
  type DirectoryExists,
  describeSourceEntry,
  findLockedSkillName,
  isGitSource,
  type LockEntry,
  locksAreEqual,
  type Project,
  type ProjectLayout,
  type ProjectLock,
  parseSource,
  type ReadProjectLock,
  type ResolveSource,
  type ResolveSourceDetails,
  requireUniqueSkillNames,
  type SourceEntry,
  type VendorPlan,
  vendoredSkillPath,
} from "@ponte/core";
import type { SkillNames } from "./skill-name";

export type ProjectSkill = {
  readonly name: string;
  readonly source: string;
  readonly directory: string;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export type FetchedSkill = {
  readonly name: string;
  readonly directory: string;
  readonly commit: string | null;
};

export type ProjectResolution = {
  readonly skills: readonly ProjectSkill[];
  readonly plan: VendorPlan;
  readonly lock: ProjectLock;
  readonly lockChanged: boolean;
  readonly pending: number;
};

export type FetchSkill = (entry: SourceEntry) => Promise<FetchedSkill>;

export type VendorSkill = (
  layout: ProjectLayout,
  fetched: FetchedSkill,
) => Promise<void>;

export type ResolveProjectSkills = (
  project: Project,
  materialize: boolean,
) => Promise<ProjectResolution>;

type FetchSkillDeps = {
  resolveSourceDetails: ResolveSourceDetails;
  skillNames: SkillNames;
};

type VendorSkillDeps = {
  copyDirectoryWithoutGit: CopyDirectoryWithoutGit;
};

type EntryResolution = {
  readonly entry: SourceEntry;
  readonly skill: ProjectSkill | null;
  readonly fresh: boolean;
};

type ResolveProjectSkillsDeps = {
  readProjectLock: ReadProjectLock;
  resolveSource: ResolveSource;
  directoryExists: DirectoryExists;
  skillNames: SkillNames;
  fetchSkill: FetchSkill;
  vendorSkill: VendorSkill;
};

export const createVendorSkill =
  (deps: VendorSkillDeps): VendorSkill =>
  (layout, fetched) =>
    deps.copyDirectoryWithoutGit(
      fetched.directory,
      vendoredSkillPath(layout, fetched.name),
    );

export const createFetchSkill =
  (deps: FetchSkillDeps): FetchSkill =>
  async entry => {
    const resolved = await deps.resolveSourceDetails(
      parseSource(entry.source, entry.ref, entry.subdir),
    );
    return {
      name: await deps.skillNames.read(
        describeSourceEntry(entry),
        resolved.directory,
      ),
      directory: resolved.directory,
      commit: resolved.commit,
    };
  };

export const createResolveProjectSkills = (
  deps: ResolveProjectSkillsDeps,
): ResolveProjectSkills => {
  const copies = new Map<string, Promise<void>>();

  const localSkill = async (
    entry: SourceEntry,
    source: string,
  ): Promise<ProjectSkill> => {
    const directory = await deps.resolveSource(
      parseSource(entry.source, entry.ref, entry.subdir),
    );
    return {
      name: await deps.skillNames.read(source, directory),
      source,
      directory,
      vendored: false,
      commit: null,
    };
  };

  const matchedVendoredSkill = async (
    layout: ProjectLayout,
    lock: ProjectLock,
    entry: SourceEntry,
    source: string,
  ): Promise<ProjectSkill | null> => {
    const name = findLockedSkillName(lock, entry);
    const locked = name === null ? undefined : lock.skills[name];
    if (name === null || locked === undefined) {
      return null;
    }
    const directory = vendoredSkillPath(layout, name);
    if (!(await deps.directoryExists(directory))) {
      return null;
    }
    await deps.skillNames.checkVendored(source, directory);
    return { name, source, directory, vendored: true, commit: locked.commit };
  };

  const freshVendoredSkill = async (
    layout: ProjectLayout,
    entry: SourceEntry,
    source: string,
  ): Promise<ProjectSkill> => {
    const fetched = await deps.fetchSkill(entry);
    const directory = vendoredSkillPath(layout, fetched.name);
    if (await deps.directoryExists(directory)) {
      await deps.skillNames.checkVendored(source, directory);
    } else {
      const copy =
        copies.get(fetched.name) ?? deps.vendorSkill(layout, fetched);
      copies.set(fetched.name, copy);
      await copy;
    }
    return {
      name: fetched.name,
      source,
      directory,
      vendored: true,
      commit: fetched.commit,
    };
  };

  const resolveEntry = async (
    project: Project,
    lock: ProjectLock,
    entry: SourceEntry,
    materialize: boolean,
  ): Promise<EntryResolution> => {
    const source = describeSourceEntry(entry);
    if (!isGitSource(entry.source)) {
      return { entry, skill: await localSkill(entry, source), fresh: false };
    }
    const matched = await matchedVendoredSkill(
      project.layout,
      lock,
      entry,
      source,
    );
    if (matched !== null) {
      return { entry, skill: matched, fresh: false };
    }
    return {
      entry,
      skill: materialize
        ? await freshVendoredSkill(project.layout, entry, source)
        : null,
      fresh: true,
    };
  };

  return async (project, materialize) => {
    copies.clear();
    const lock = await deps.readProjectLock(project.layout);
    const resolutions = await Promise.all(
      project.config.skills.map(entry =>
        resolveEntry(project, lock, entry, materialize),
      ),
    );
    const locked: Record<string, LockEntry> = {};
    const skills: ProjectSkill[] = [];
    let pending = 0;
    for (const { entry, skill, fresh } of resolutions) {
      pending += fresh ? 1 : 0;
      if (skill === null) {
        continue;
      }
      if (skill.commit !== null) {
        locked[skill.name] = createLockEntry(entry, skill.commit);
      }
      skills.push(skill);
    }
    requireUniqueSkillNames(skills);
    const next: ProjectLock = { skills: materialize ? locked : lock.skills };
    return {
      skills,
      plan: buildProjectPlan(project.layout, skills),
      lock: next,
      lockChanged: materialize && !locksAreEqual(lock, next),
      pending,
    };
  };
};
