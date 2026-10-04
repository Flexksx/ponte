const SHORT_COMMIT_LENGTH = 7;

export const formatShortCommit = (commit: string): string =>
  commit.slice(0, SHORT_COMMIT_LENGTH);
