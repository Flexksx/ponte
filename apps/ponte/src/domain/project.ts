import { dirname, isAbsolute, join, relative } from "node:path";
import { absoluteSources, type SourceEntry } from "./config";
import type { Link, VendorPlan } from "./link";

export const PROJECT_CONFIG_FILE = "ponte.toml";

export const PROJECT_SOURCES_DIRECTORY = join(".ponte", "sources");

export const PROJECT_SKILLS_DIRECTORY = join(".agents", "skills");

const PROJECT_LOCK_FILE = join(".ponte", "lock.toml");

const SHORT_COMMIT_LENGTH = 7;

export type ProjectConfig = { readonly skills: Readonly<Record<string, SourceEntry>> };

export type LockEntry = { readonly commit: string };

export type ProjectLock = { readonly skills: Readonly<Record<string, LockEntry>> };

export type ProjectLayout = {
  readonly root: string;
  readonly skills: string;
  readonly sources: string;
  readonly lockFile: string;
};

export type ProjectSkillTarget = { readonly name: string; readonly directory: string };

export const projectLayout = (root: string): ProjectLayout => ({
  root,
  skills: join(root, PROJECT_SKILLS_DIRECTORY),
  sources: join(root, PROJECT_SOURCES_DIRECTORY),
  lockFile: join(root, PROJECT_LOCK_FILE),
});

export const vendoredSkillPath = (layout: ProjectLayout, name: string): string =>
  join(layout.sources, name);

export const shortCommit = (commit: string): string => commit.slice(0, SHORT_COMMIT_LENGTH);

export const ancestorDirectories = (start: string): readonly string[] => {
  const directories = [start];
  let current = start;
  let parent = dirname(start);
  while (parent !== current) {
    directories.push(parent);
    current = parent;
    parent = dirname(parent);
  }
  return directories;
};

export const normalizeProjectConfig = (config: ProjectConfig, root: string): ProjectConfig => ({
  skills: absoluteSources(config.skills, root),
});

const isInsideProject = (root: string, path: string): boolean => {
  const inside = relative(root, path);
  return inside !== "" && !inside.startsWith("..") && !isAbsolute(inside);
};

const skillLinkTarget = (layout: ProjectLayout, linkPath: string, directory: string): string =>
  isInsideProject(layout.root, directory) ? relative(dirname(linkPath), directory) : directory;

const skillLink = (layout: ProjectLayout, skill: ProjectSkillTarget): Link => {
  const path = join(layout.skills, skill.name);
  return { path, target: skillLinkTarget(layout, path, skill.directory) };
};

export const planProject = (
  layout: ProjectLayout,
  skills: readonly ProjectSkillTarget[],
): VendorPlan => ({
  links: skills.map(skill => skillLink(layout, skill)),
  ownedDirectories: [layout.skills],
});
