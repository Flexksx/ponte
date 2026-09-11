import {
  buildProjectPlan,
  type CopyDirectoryWithoutGit,
  type DirectoryExists,
  isGitSource,
  type LockEntry,
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
import type { Project } from "./find-project";

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
    const skills: ProjectSkill[] = [];
    const vendored: string[] = [];
    for (const [name, entry] of Object.entries(project.config.skills)) {
      if (!isGitSource(entry.source)) {
        const directory = await deps.resolveSource(
          parseSource(entry.source, entry.ref, entry.subdir),
        );
        skills.push({ name, directory, vendored: false, commit: null });
        continue;
      }
      const directory = vendoredSkillPath(project.layout, name);
      if (!(await deps.directoryExists(directory))) {
        vendored.push(name);
        if (materialize) {
          const commit = await deps.copyVendorSkill(
            project.layout,
            name,
            entry,
          );
          if (commit !== null) locked[name] = { commit };
        }
      }
      skills.push({
        name,
        directory,
        vendored: true,
        commit: locked[name]?.commit ?? null,
      });
    }
    return {
      skills,
      plan: buildProjectPlan(project.layout, skills),
      lock: { skills: locked },
      vendored,
    };
  };
