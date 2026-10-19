const ISSUE_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;

const PULL_REQUEST_URL = /github\.com\/[^/\s]+\/([^/\s]+)\/pull\/(\d+)/g;

const PULL_REQUEST_REFERENCE = /(?<![\w/.-])([a-z][a-z0-9-]*)#(\d+)\b/g;

export const extractMentions = (text: string): string[] => {
  const found = new Set<string>();
  for (const match of text.matchAll(ISSUE_KEY)) {
    found.add(match[0]);
  }
  for (const [, repository, number] of text.matchAll(PULL_REQUEST_URL)) {
    found.add(`${repository?.toLowerCase()}#${number}`);
  }
  for (const [, repository, number] of text.matchAll(PULL_REQUEST_REFERENCE)) {
    found.add(`${repository}#${number}`);
  }
  return [...found];
};
