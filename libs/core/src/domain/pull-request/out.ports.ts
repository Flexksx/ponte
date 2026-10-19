import type { PullRequestLookup } from "./types";

export type ReadPullRequest = (url: string) => Promise<PullRequestLookup>;
