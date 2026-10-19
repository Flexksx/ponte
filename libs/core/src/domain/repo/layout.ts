import { join } from "node:path";
import type { LayoutInput, VendorName } from "../vendor";
import { buildVendorLayouts, SHARED_SKILLS_DIRECTORY } from "../vendor";
import type { RepoLayout } from "./types";

export const REPO_SOURCES_DIRECTORY = join(".ponte", "sources");

export const REPO_SKILLS_DIRECTORY = SHARED_SKILLS_DIRECTORY;

const REPO_LOCK_FILE = join(".ponte", "lock.toml");

export const repoLayout = (
  input: LayoutInput,
  enabledVendors?: readonly VendorName[],
): RepoLayout => {
  const layouts = buildVendorLayouts(input);
  const selected = (enabledVendors ?? Object.keys(layouts)).map(
    name => layouts[name as VendorName],
  );
  const skills = join(input.root, REPO_SKILLS_DIRECTORY);
  const vendorDirs = new Set(selected.map(layout => layout.skills));
  vendorDirs.delete(skills);
  const legacyDirs = new Set(selected.flatMap(layout => layout.legacySkills));
  for (const dir of [skills, ...vendorDirs]) {
    legacyDirs.delete(dir);
  }
  return {
    root: input.root,
    skills,
    vendorSkillDirectories: [...vendorDirs],
    legacySkillDirectories: [...legacyDirs],
    sources: join(input.root, REPO_SOURCES_DIRECTORY),
    lockFile: join(input.root, REPO_LOCK_FILE),
  };
};

export const vendoredSkillPath = (layout: RepoLayout, name: string): string =>
  join(layout.sources, name);
