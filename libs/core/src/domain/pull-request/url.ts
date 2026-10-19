const GITHUB_PULL_REQUEST = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;

export const isPullRequestUrl = (target: string): boolean =>
  GITHUB_PULL_REQUEST.test(target);
