import {
  buildProjectPlan,
  type CopyDirectoryWithoutGit,
  classifySkillEntries,
  type DirectoryExists,
  type LockEntry,
  type Project,
  type ProjectLayout,
  type ProjectLock,
  parseSource,
  type ReadProjectLock,
  type ResolveSource,
  type ResolveSourceDetails,
  type SourceEntry,
  type VendorPlan,
  vendoredSkillPath,
} from "@ponte/core";

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

export type CopyVendorSkill = (
  layout: ProjectLayout,
  name: string,
  entry: SourceEntry,
) => Promise<string | null>;

export type ResolveProjectSkills = (
  project: Project,
  materialize: boolean,
) => Promise<ProjectResolution>;

type CopyVendorSkillDeps = {
  resolveSourceDetails: ResolveSourceDetails;
  copyDirectoryWithoutGit: CopyDirectoryWithoutGit;
};

export const createCopyVendorSkill =
  (deps: CopyVendorSkillDeps): CopyVendorSkill =>
  async (layout, name, entry) => {
    const resolved = await deps.resolveSourceDetails(
      parseSource(entry.source, entry.ref, entry.subdir),
    );
    await deps.copyDirectoryWithoutGit(
      resolved.directory,
      vendoredSkillPath(layout, name),
    );
    return resolved.commit;
  };

type ResolveProjectSkillsDeps = {
  readProjectLock: ReadProjectLock;
  resolveSource: ResolveSource;
  directoryExists: DirectoryExists;
  copyVendorSkill: CopyVendorSkill;
};

export const createResolveProjectSkills =
  (deps: ResolveProjectSkillsDeps): ResolveProjectSkills =>
  async (project, materialize) => {
    const locked: Record<string, LockEntry> = {
      ...(await deps.readProjectLock(project.layout)).skills,
    };
    const classified = classifySkillEntries(project.config, project.layout);
    const skills: ProjectSkill[] = [];
    const vendored: string[] = [];
    for (const entry of classified) {
      if (entry.kind === "local") {
        const directory = await deps.resolveSource(
          parseSource(entry.entry.source, entry.entry.ref, entry.entry.subdir),
        );
        skills.push({
          name: entry.name,
          directory,
          vendored: false,
          commit: null,
        });
        continue;
      }
      if (!(await deps.directoryExists(entry.directory))) {
        vendored.push(entry.name);
        if (materialize) {
          const commit = await deps.copyVendorSkill(
            project.layout,
            entry.name,
            entry.entry,
          );
          if (commit !== null) locked[entry.name] = { commit };
        }
      }
      skills.push({
        name: entry.name,
        directory: entry.directory,
        vendored: true,
        commit: locked[entry.name]?.commit ?? null,
      });
    }
    return {
      skills,
      plan: buildProjectPlan(project.layout, skills),
      lock: { skills: locked },
      vendored,
    };
  };
