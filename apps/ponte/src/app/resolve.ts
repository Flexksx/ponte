import type { Config, SourceEntry } from "../domain/config";
import { planVendor, type ResolvedEntry, type VendorPlan } from "../domain/link";
import { type NamedSkill, requireUniqueSkillNames } from "../domain/skill";
import { parseSource } from "../domain/source";
import { type VendorName, vendorLayouts } from "../domain/vendor";
import { listFiles } from "../infra/filesystem";
import { resolveSource } from "../infra/git";
import { currentPlatform, gitCacheDirectoryPath, homeDirectory } from "../infra/paths";
import { readSkillName, sourceOf } from "./skills";

const resolveDirectory = (entry: SourceEntry): Promise<string> =>
  resolveSource(parseSource(entry.source, entry.ref, entry.subdir), gitCacheDirectoryPath());

const resolveSkills = async (entries: readonly SourceEntry[]): Promise<ResolvedEntry[]> => {
  const skills: ResolvedEntry[] = [];
  const named: NamedSkill[] = [];
  for (const entry of entries) {
    const source = sourceOf(entry);
    const sourceDirectory = await resolveDirectory(entry);
    const name = await readSkillName(source, sourceDirectory);
    skills.push({ name, sourceDirectory, files: [] });
    named.push({ name, source });
  }
  requireUniqueSkillNames(named);
  return skills;
};

const resolveSubagents = (
  entries: Readonly<Record<string, SourceEntry>>,
): Promise<ResolvedEntry[]> =>
  Promise.all(
    Object.entries(entries).map(async ([name, entry]) => {
      const sourceDirectory = await resolveDirectory(entry);
      return { name, sourceDirectory, files: await listFiles(sourceDirectory) };
    }),
  );

export const planVendors = async (
  config: Config,
  promptPath: string,
): Promise<Record<VendorName, VendorPlan>> => {
  const skills = await resolveSkills(config.skills);
  const subagents = await resolveSubagents(config.subagents);
  const layouts = vendorLayouts(homeDirectory(), currentPlatform());
  const plans = {} as Record<VendorName, VendorPlan>;
  for (const [name, layout] of Object.entries(layouts)) {
    plans[name as VendorName] = planVendor(layout, promptPath, skills, subagents);
  }
  return plans;
};
