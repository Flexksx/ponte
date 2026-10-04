import {
  buildProjectPlan,
  collect,
  createLockEntry,
  describeSourceEntry,
  findLockedSkillName,
  isGitSource,
  type LinkPlan,
  type LockEntry,
  locksAreEqual,
  ok,
  type Problem,
  type Project,
  type ProjectFiles,
  type ProjectLayout,
  type ProjectLock,
  parseSourceEntry,
  type Result,
  requireUniqueSkillNames,
  type SourceEntry,
  type Sources,
  type VendoredSkills,
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
  readonly plan: LinkPlan;
  readonly lock: ProjectLock;
  readonly lockChanged: boolean;
  readonly pending: number;
};

export type FetchSkill = (
  entry: SourceEntry,
) => Promise<Result<FetchedSkill, Problem>>;

export type VendorSkill = (
  layout: ProjectLayout,
  fetched: FetchedSkill,
) => Promise<void>;

export type ResolveProjectSkills = (
  project: Project,
  materialize: boolean,
) => Promise<Result<ProjectResolution, Problem>>;

type FetchSkillDeps = {
  sources: Sources;
  skillNames: SkillNames;
};

type VendorSkillDeps = {
  vendoredSkills: VendoredSkills;
};

type EntryResolution = {
  readonly entry: SourceEntry;
  readonly skill: ProjectSkill | null;
  readonly fresh: boolean;
};

type ResolveProjectSkillsDeps = {
  projectFiles: ProjectFiles;
  sources: Sources;
  vendoredSkills: VendoredSkills;
  skillNames: SkillNames;
  fetchSkill: FetchSkill;
  vendorSkill: VendorSkill;
};

export const createVendorSkill =
  (deps: VendorSkillDeps): VendorSkill =>
  (layout, fetched) =>
    deps.vendoredSkills.copy(
      fetched.directory,
      vendoredSkillPath(layout, fetched.name),
    );

export const createFetchSkill =
  (deps: FetchSkillDeps): FetchSkill =>
  async entry => {
    const resolved = await deps.sources.resolve(parseSourceEntry(entry));
    if (!resolved.ok) {
      return resolved;
    }
    const name = await deps.skillNames.read(
      describeSourceEntry(entry),
      resolved.value.directory,
    );
    return name.ok
      ? ok({
          name: name.value,
          directory: resolved.value.directory,
          commit: resolved.value.commit,
        })
      : name;
  };

export const createResolveProjectSkills = (
  deps: ResolveProjectSkillsDeps,
): ResolveProjectSkills => {
  const copies = new Map<string, Promise<void>>();

  const localSkill = async (
    entry: SourceEntry,
    source: string,
  ): Promise<Result<ProjectSkill, Problem>> => {
    const resolved = await deps.sources.resolve(parseSourceEntry(entry));
    if (!resolved.ok) {
      return resolved;
    }
    const directory = resolved.value.directory;
    const name = await deps.skillNames.read(source, directory);
    return name.ok
      ? ok({
          name: name.value,
          source,
          directory,
          vendored: false,
          commit: null,
        })
      : name;
  };

  const matchedVendoredSkill = async (
    layout: ProjectLayout,
    lock: ProjectLock,
    entry: SourceEntry,
    source: string,
  ): Promise<Result<ProjectSkill | null, Problem>> => {
    const name = findLockedSkillName(lock, entry);
    const locked = name === null ? undefined : lock.skills[name];
    if (name === null || locked === undefined) {
      return ok(null);
    }
    const directory = vendoredSkillPath(layout, name);
    if (!(await deps.vendoredSkills.exists(directory))) {
      return ok(null);
    }
    const checked = await deps.skillNames.checkVendored(source, directory);
    return checked.ok
      ? ok({ name, source, directory, vendored: true, commit: locked.commit })
      : checked;
  };

  const freshVendoredSkill = async (
    layout: ProjectLayout,
    entry: SourceEntry,
    source: string,
  ): Promise<Result<ProjectSkill, Problem>> => {
    const fetched = await deps.fetchSkill(entry);
    if (!fetched.ok) {
      return fetched;
    }
    const { name, commit } = fetched.value;
    const directory = vendoredSkillPath(layout, name);
    const existed = await deps.vendoredSkills.exists(directory);
    const inFlight = copies.get(name);
    if (inFlight !== undefined) {
      await inFlight;
    } else if (existed) {
      const checked = await deps.skillNames.checkVendored(source, directory);
      if (!checked.ok) {
        return checked;
      }
    } else {
      const copy = deps.vendorSkill(layout, fetched.value);
      copies.set(name, copy);
      await copy;
    }
    return ok({ name, source, directory, vendored: true, commit });
  };

  const resolveEntry = async (
    project: Project,
    lock: ProjectLock,
    entry: SourceEntry,
    materialize: boolean,
  ): Promise<Result<EntryResolution, Problem>> => {
    const source = describeSourceEntry(entry);
    if (!isGitSource(entry.source)) {
      const skill = await localSkill(entry, source);
      return skill.ok ? ok({ entry, skill: skill.value, fresh: false }) : skill;
    }
    const matched = await matchedVendoredSkill(
      project.layout,
      lock,
      entry,
      source,
    );
    if (!matched.ok) {
      return matched;
    }
    if (matched.value !== null) {
      return ok({ entry, skill: matched.value, fresh: false });
    }
    if (!materialize) {
      return ok({ entry, skill: null, fresh: true });
    }
    const fresh = await freshVendoredSkill(project.layout, entry, source);
    return fresh.ok ? ok({ entry, skill: fresh.value, fresh: true }) : fresh;
  };

  return async (project, materialize) => {
    copies.clear();
    const lock = await deps.projectFiles.readLock(project.layout);
    if (!lock.ok) {
      return lock;
    }
    const resolutions = collect(
      await Promise.all(
        project.config.skills.map(entry =>
          resolveEntry(project, lock.value, entry, materialize),
        ),
      ),
    );
    if (!resolutions.ok) {
      return resolutions;
    }
    const locked: Record<string, LockEntry> = {};
    const skills: ProjectSkill[] = [];
    let pending = 0;
    for (const { entry, skill, fresh } of resolutions.value) {
      pending += fresh ? 1 : 0;
      if (skill === null) {
        continue;
      }
      if (skill.commit !== null) {
        locked[skill.name] = createLockEntry(entry, skill.commit);
      }
      skills.push(skill);
    }
    const unique = requireUniqueSkillNames(skills);
    if (!unique.ok) {
      return unique;
    }
    const next: ProjectLock = {
      skills: materialize ? locked : lock.value.skills,
    };
    return ok({
      skills,
      plan: buildProjectPlan(project.layout, skills),
      lock: next,
      lockChanged: materialize && !locksAreEqual(lock.value, next),
      pending,
    });
  };
};
