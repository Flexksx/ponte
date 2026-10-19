import type {
  SessionDto,
  SkillsDto,
  SourceKindDto,
  StatusDto,
  SubagentDto,
  WorkspaceDto,
} from "@ponte/api-client/dto";
import {
  type AgentSession,
  describeSourceEntry,
  isGitSource,
  type SkillListing,
  type SourceEntry,
  type StatusOutcome,
  type Workspace,
} from "@ponte/core";

const sourceKind = (entry: SourceEntry): SourceKindDto =>
  isGitSource(entry.source) ? "git" : "local";

export const toWorkspaceDto = (workspace: Workspace): WorkspaceDto => ({
  name: workspace.name,
  goal: workspace.goal,
  next: workspace.next,
  links: workspace.links,
  decisions: workspace.decisions,
});

export const toSessionDto = (session: AgentSession): SessionDto => ({
  agent: session.agent,
  id: session.id,
  directory: session.directory,
  startedAt: session.startedAt,
  title: session.title,
  resume: session.resume,
});

export const toStatusDto = (outcome: StatusOutcome): StatusDto =>
  outcome.mode === "global"
    ? {
        mode: "global",
        promptFile: outcome.report.promptFile,
        agents: outcome.report.vendors.map(vendor => ({
          name: vendor.name,
          enabled: vendor.enabled,
          linkCount: vendor.linkCount,
          state: vendor.state,
        })),
      }
    : {
        mode: "repo",
        root: outcome.report.root,
        skillsDirectory: outcome.report.skillsDirectory,
        linkCount: outcome.report.linkCount,
        state: outcome.report.state,
      };

export const toSkillsDto = (listing: SkillListing): SkillsDto => ({
  mode: listing.mode,
  skills: listing.rows.map(row => ({
    name: row.name,
    source: describeSourceEntry(row.entry),
    kind: sourceKind(row.entry),
  })),
});

export const toSubagentDto = (entry: SourceEntry): SubagentDto => ({
  source: describeSourceEntry(entry),
  kind: sourceKind(entry),
});
