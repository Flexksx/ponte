import type { Config, SourceEntry } from "../domain/config";
import { planVendor, type ResolvedEntry, type VendorPlan } from "../domain/link";
import { parseSource } from "../domain/source";
import { type VendorName, vendorLayouts } from "../domain/vendor";
import { listFiles } from "../infra/filesystem";
import { resolveSource } from "../infra/git";
import { currentPlatform, gitCacheDirectoryPath, homeDirectory } from "../infra/paths";

const resolveDirectory = (entry: SourceEntry): Promise<string> =>
  resolveSource(parseSource(entry.source, entry.ref, entry.subdir), gitCacheDirectoryPath());

const resolveSkills = (entries: Readonly<Record<string, SourceEntry>>): Promise<ResolvedEntry[]> =>
  Promise.all(
    Object.entries(entries).map(async ([name, entry]) => ({
      name,
      sourceDirectory: await resolveDirectory(entry),
      files: [],
    })),
  );

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
