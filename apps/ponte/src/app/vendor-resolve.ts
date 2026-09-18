import {
  buildVendorLayouts,
  buildVendorPlan,
  type Config,
  describeSourceEntry,
  type ListFiles,
  type NamedSkill,
  type Platform,
  parseSource,
  type ResolvedSkill,
  type ResolvedSubagent,
  type ResolveSource,
  requireUniqueSkillNames,
  type SourceEntry,
  type VendorName,
  type VendorPlan,
} from "@ponte/core";
import type { SkillNames } from "./skill-name";

export type BuildVendorPlans = (
  config: Config,
  promptPath: string,
) => Promise<Record<VendorName, VendorPlan>>;

type BuildVendorPlansDeps = {
  resolveSource: ResolveSource;
  listFiles: ListFiles;
  skillNames: SkillNames;
  home: string;
  platform: Platform;
};

export const createBuildVendorPlans =
  (deps: BuildVendorPlansDeps): BuildVendorPlans =>
  async (config, promptPath) => {
    const resolveDirectory = (entry: SourceEntry): Promise<string> =>
      deps.resolveSource(parseSource(entry.source, entry.ref, entry.subdir));

    const skills: ResolvedSkill[] = [];
    const named: NamedSkill[] = [];
    for (const entry of config.skills) {
      const source = describeSourceEntry(entry);
      const sourceDirectory = await resolveDirectory(entry);
      const name = await deps.skillNames.read(source, sourceDirectory);
      skills.push({ name, sourceDirectory });
      named.push({ name, source });
    }
    requireUniqueSkillNames(named);

    const subagents: ResolvedSubagent[] = [];
    for (const entry of config.subagents) {
      const sourceDirectory = await resolveDirectory(entry);
      subagents.push({
        sourceDirectory,
        files: await deps.listFiles(sourceDirectory),
      });
    }

    const layouts = buildVendorLayouts(deps.home, deps.platform);
    const plans = {} as Record<VendorName, VendorPlan>;
    for (const [name, layout] of Object.entries(layouts)) {
      plans[name as VendorName] = buildVendorPlan(
        layout,
        promptPath,
        skills,
        subagents,
      );
    }
    return plans;
  };
