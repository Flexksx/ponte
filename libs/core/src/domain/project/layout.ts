import { join } from "node:path";
import type { LayoutInput, VendorName } from "../vendor";
import { buildVendorLayouts, SHARED_SKILLS_DIRECTORY } from "../vendor";
import type { ProjectLayout } from "./types";

export const PROJECT_SOURCES_DIRECTORY = join(".ponte", "sources");

export const PROJECT_SKILLS_DIRECTORY = SHARED_SKILLS_DIRECTORY;

const PROJECT_LOCK_FILE = join(".ponte", "lock.toml");

export const projectLayout = (
  input: LayoutInput,
  enabledVendors?: readonly VendorName[],
): ProjectLayout => {
  const layouts = buildVendorLayouts(input);
  const selected = (enabledVendors ?? Object.keys(layouts)).map(
    name => layouts[name as VendorName],
  );
  const skills = join(input.root, PROJECT_SKILLS_DIRECTORY);
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
    sources: join(input.root, PROJECT_SOURCES_DIRECTORY),
    lockFile: join(input.root, PROJECT_LOCK_FILE),
  };
};

export const vendoredSkillPath = (
  layout: ProjectLayout,
  name: string,
): string => join(layout.sources, name);
