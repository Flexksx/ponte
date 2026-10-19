import type { WorkspaceLink } from "@ponte/core";

export type LinkKind =
  | "pull-request"
  | "workflow"
  | "ticket"
  | "thread"
  | "folder"
  | "page";

export type DescribedLink = {
  readonly kind: LinkKind;
  readonly label: string;
  readonly href: string | null;
  readonly note: string;
};

export type LinkGroup = {
  readonly heading: string;
  readonly links: readonly DescribedLink[];
};

const GITHUB_PULL_REQUEST =
  /^https:\/\/github\.com\/[^/]+\/([^/]+)\/pull\/(\d+)/;

const GITHUB_ACTIONS =
  /^https:\/\/github\.com\/[^/]+\/([^/]+)\/actions(?:\/(?:workflows\/([^/?#]+)|runs\/(\d+)))?/;

const JIRA_ISSUE =
  /^https:\/\/[^/]+\.atlassian\.net\/browse\/([A-Z][A-Z0-9]*-\d+)/;

const SLACK = /^https:\/\/[^/]+\.slack\.com\//;

const WEB_ADDRESS = /^https?:\/\//;

const GROUPS: ReadonlyArray<readonly [LinkKind, string]> = [
  ["pull-request", "Pull requests"],
  ["workflow", "Workflows and runs"],
  ["ticket", "Tickets"],
  ["thread", "Threads"],
  ["folder", "Folders"],
  ["page", "Pages"],
];

const describeWebLink = (target: string): Omit<DescribedLink, "note"> => {
  const pullRequest = GITHUB_PULL_REQUEST.exec(target);
  if (pullRequest !== null) {
    return {
      kind: "pull-request",
      label: `${pullRequest[1]}#${pullRequest[2]}`,
      href: target,
    };
  }
  const actions = GITHUB_ACTIONS.exec(target);
  if (actions !== null) {
    const detail = actions[2] ?? (actions[3] ? `run ${actions[3]}` : "actions");
    return {
      kind: "workflow",
      label: `${actions[1]}: ${detail}`,
      href: target,
    };
  }
  const issue = JIRA_ISSUE.exec(target);
  if (issue?.[1] !== undefined) {
    return { kind: "ticket", label: issue[1], href: target };
  }
  if (SLACK.test(target)) {
    return { kind: "thread", label: "Slack thread", href: target };
  }
  const url = new URL(target);
  return { kind: "page", label: `${url.host}${url.pathname}`, href: target };
};

export const describeLink = (link: WorkspaceLink): DescribedLink =>
  WEB_ADDRESS.test(link.target)
    ? { ...describeWebLink(link.target), note: link.note }
    : { kind: "folder", label: link.target, href: null, note: link.note };

export const groupLinks = (links: readonly WorkspaceLink[]): LinkGroup[] => {
  const described = links.map(describeLink);
  return GROUPS.map(([kind, heading]) => ({
    heading,
    links: described.filter(link => link.kind === kind),
  })).filter(group => group.links.length > 0);
};
