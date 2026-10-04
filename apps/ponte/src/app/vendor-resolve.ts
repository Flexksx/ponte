import {
  buildVendorLayouts,
  buildVendorPlan,
  type Config,
  collect,
  describeSourceEntry,
  type LinkPlan,
  type ListSubagentFiles,
  type NamedSkill,
  ok,
  type Platform,
  type Problem,
  parseSourceEntry,
  type ResolvedSkill,
  type ResolvedSubagent,
  type Result,
  requireUniqueSkillNames,
  resolveConfigPaths,
  type SourceEntry,
  type Sources,
  type VendorName,
} from "@ponte/core";
import type { SkillNames } from "./skill-name";
import type { ReadVendorVersions } from "./vendor-versions";

export type BuildVendorPlans = (
  config: Config,
  promptPath: string,
) => Promise<Result<Record<VendorName, LinkPlan>, Problem>>;

type BuildVendorPlansDeps = {
  sources: Sources;
  listSubagentFiles: ListSubagentFiles;
  skillNames: SkillNames;
  readVendorVersions: ReadVendorVersions;
  home: string;
  platform: Platform;
  configDirectory: string;
};

export const createBuildVendorPlans =
  (deps: BuildVendorPlansDeps): BuildVendorPlans =>
  async (declared, promptPath) => {
    const config = resolveConfigPaths(declared, deps.configDirectory);

    const resolveDirectory = async (
      entry: SourceEntry,
    ): Promise<Result<string, Problem>> => {
      const resolved = await deps.sources.resolve(parseSourceEntry(entry));
      return resolved.ok ? ok(resolved.value.directory) : resolved;
    };

    const resolveSkill = async (
      entry: SourceEntry,
    ): Promise<Result<ResolvedSkill & NamedSkill, Problem>> => {
      const source = describeSourceEntry(entry);
      const directory = await resolveDirectory(entry);
      if (!directory.ok) {
        return directory;
      }
      const name = await deps.skillNames.read(source, directory.value);
      return name.ok
        ? ok({ name: name.value, source, sourceDirectory: directory.value })
        : name;
    };

    const resolveSubagent = async (
      entry: SourceEntry,
    ): Promise<Result<ResolvedSubagent, Problem>> => {
      const directory = await resolveDirectory(entry);
      if (!directory.ok) {
        return directory;
      }
      return ok({
        sourceDirectory: directory.value,
        files: await deps.listSubagentFiles(directory.value),
      });
    };

    const [skillResults, subagentResults] = await Promise.all([
      Promise.all(config.skills.map(resolveSkill)),
      Promise.all(config.subagents.map(resolveSubagent)),
    ]);
    const skills = collect(skillResults);
    if (!skills.ok) {
      return skills;
    }
    const subagents = collect(subagentResults);
    if (!subagents.ok) {
      return subagents;
    }
    const unique = requireUniqueSkillNames(skills.value);
    if (!unique.ok) {
      return unique;
    }

    const layouts = buildVendorLayouts({
      root: deps.home,
      platform: deps.platform,
      versions: await deps.readVendorVersions(),
    });
    const plans = {} as Record<VendorName, LinkPlan>;
    for (const [name, layout] of Object.entries(layouts)) {
      plans[name as VendorName] = buildVendorPlan(
        layout,
        promptPath,
        skills.value,
        subagents.value,
      );
    }
    return ok(plans);
  };
