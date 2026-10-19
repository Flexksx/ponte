import type { Repository } from "./types";

const GITHUB_REPOSITORY =
  /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/#?].*)?$/;

export const parseGitHubRepository = (url: string): Repository | null => {
  const match = GITHUB_REPOSITORY.exec(url.trim());
  return match?.[1] === undefined || match[2] === undefined
    ? null
    : { owner: match[1], name: match[2] };
};
