const GIT_SOURCE = /^(https?:\/\/|git@|file:\/\/)/;

export type SkillSource =
  | { readonly type: "local"; readonly path: string }
  | { readonly type: "git"; readonly url: string; readonly ref: string; readonly subdir?: string };

export class MissingGitRefError extends Error {
  constructor(url: string) {
    super(`git source ${url} needs a ref`);
  }
}

export const isGitSource = (source: string): boolean => GIT_SOURCE.test(source);

export const parseSource = (source: string, ref = "", subdir = ""): SkillSource =>
  isGitSource(source)
    ? { type: "git", url: source, ref, subdir: subdir || undefined }
    : { type: "local", path: source };

export const describeSource = (source: SkillSource): string => {
  if (source.type === "local") return source.path;
  const ref = source.ref ? `@${source.ref}` : "";
  const subdir = source.subdir ? ` (subdir: ${source.subdir})` : "";
  return `${source.url}${ref}${subdir}`;
};
