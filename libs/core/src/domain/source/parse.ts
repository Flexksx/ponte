import { isAbsolute, join } from "node:path";
import type { SkillSource, SourceEntry } from "./types";

const GIT_SOURCE = /^(https?:\/\/|git@|file:\/\/)/;

export const isGitSource = (source: string): boolean => GIT_SOURCE.test(source);

export const parseSource = (
  source: string,
  ref = "",
  subdir = "",
): SkillSource =>
  isGitSource(source)
    ? { type: "git", url: source, ref, subdir: subdir || undefined }
    : { type: "local", path: source };

const describeSource = (source: SkillSource): string => {
  if (source.type === "local") {
    return source.path;
  }
  const ref = source.ref ? `@${source.ref}` : "";
  const subdir = source.subdir ? ` (subdir: ${source.subdir})` : "";
  return `${source.url}${ref}${subdir}`;
};

export const parseSourceEntry = (entry: SourceEntry): SkillSource =>
  parseSource(entry.source, entry.ref, entry.subdir);

export const describeSourceEntry = (entry: SourceEntry): string =>
  describeSource(parseSourceEntry(entry));

export const sourceKey = (entry: {
  readonly source: string;
  readonly subdir?: string;
}): string => `${entry.source}\n${entry.subdir ?? ""}`;

export const resolveSourcePaths = (
  entries: readonly SourceEntry[],
  baseDirectory: string,
): SourceEntry[] =>
  entries.map(entry =>
    isGitSource(entry.source) || isAbsolute(entry.source)
      ? entry
      : { ...entry, source: join(baseDirectory, entry.source) },
  );
