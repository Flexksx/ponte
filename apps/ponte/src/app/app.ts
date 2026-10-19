import {
  type App,
  type Config,
  type ConfigStore,
  err,
  type ListSkills,
  type ListSubagents,
  ok,
  type Problem,
  type PromptStore,
  type ReadSystemPrompt,
  type Result,
  type SetSystemPrompt,
  type Status,
  type Sync,
  type UpdateSkills,
  type Workspaces,
} from "@ponte/core";
import type { FindRepo } from "./find-repo";
import type { ListConfigSkills, ListRepoSkills } from "./repo-skills";
import type { GetRepoStatusReport } from "./repo-status";
import type { SyncRepo } from "./repo-sync";
import type { RunRepoUpdate } from "./repo-update";
import type { GetStatusReport } from "./vendor-status";
import type { SyncVendors } from "./vendor-sync";

type AppDeps = {
  findRepo: FindRepo;
  config: ConfigStore;
  prompts: PromptStore;
  syncRepo: SyncRepo;
  syncVendors: SyncVendors;
  getRepoStatusReport: GetRepoStatusReport;
  getStatusReport: GetStatusReport;
  listRepoSkills: ListRepoSkills;
  listConfigSkills: ListConfigSkills;
  runRepoUpdate: RunRepoUpdate;
  workspaces: Workspaces;
};

// A repo directory, one that holds ponte.toml, selects repo mode.
// Every other directory selects global mode.
export const createApp = (deps: AppDeps): App => {
  const requireConfig = async (): Promise<Result<Config, Problem>> => {
    const config = await deps.config.read();
    if (!config.ok) {
      return config;
    }
    return config.value === null
      ? err({ kind: "no-config" })
      : ok(config.value);
  };

  const sync: Sync = async (request, apply) => {
    const repo = await deps.findRepo();
    if (!repo.ok) {
      return repo;
    }
    if (repo.value === null) {
      const report = await deps.syncVendors(request, apply);
      return report.ok ? ok({ mode: "global", report: report.value }) : report;
    }
    if (
      request.promptOverride !== undefined ||
      request.requestedVendors.length > 0
    ) {
      return err({ kind: "global-options-in-repo" });
    }
    const report = await deps.syncRepo(repo.value, apply);
    return report.ok ? ok({ mode: "repo", report: report.value }) : report;
  };

  const status: Status = async () => {
    const repo = await deps.findRepo();
    if (!repo.ok) {
      return repo;
    }
    if (repo.value !== null) {
      const report = await deps.getRepoStatusReport(repo.value);
      return report.ok ? ok({ mode: "repo", report: report.value }) : report;
    }
    const config = await requireConfig();
    if (!config.ok) {
      return config;
    }
    const report = await deps.getStatusReport(config.value);
    return report.ok ? ok({ mode: "global", report: report.value }) : report;
  };

  const listSkills: ListSkills = async () => {
    const repo = await deps.findRepo();
    if (!repo.ok) {
      return repo;
    }
    if (repo.value !== null) {
      const rows = await deps.listRepoSkills(repo.value);
      return rows.ok ? ok({ mode: "repo", rows: rows.value }) : rows;
    }
    const config = await requireConfig();
    if (!config.ok) {
      return config;
    }
    return ok({
      mode: "global",
      rows: await deps.listConfigSkills(config.value),
    });
  };

  const listSubagents: ListSubagents = async () => {
    const config = await requireConfig();
    return config.ok ? ok(config.value.subagents) : config;
  };

  const updateSkills: UpdateSkills = async (name, force) => {
    const repo = await deps.findRepo();
    if (!repo.ok) {
      return repo;
    }
    return repo.value === null
      ? err({ kind: "not-in-repo" })
      : deps.runRepoUpdate(repo.value, name, force);
  };

  const readSystemPrompt: ReadSystemPrompt = async () => {
    const config = await requireConfig();
    if (!config.ok) {
      return config;
    }
    const prompt = await deps.prompts.read(config.value.systemPromptFile);
    return prompt === null ? err({ kind: "no-prompt" }) : ok(prompt);
  };

  // The argument is a path when a file exists there, and prompt text when not.
  const setSystemPrompt: SetSystemPrompt = async fileOrLiteral => {
    const config = await requireConfig();
    if (!config.ok) {
      return config;
    }
    const content =
      (await deps.prompts.readFile(fileOrLiteral)) ?? fileOrLiteral;
    await deps.prompts.write(config.value.systemPromptFile, content);
    return ok(null);
  };

  return {
    sync,
    status,
    listSkills,
    listSubagents,
    updateSkills,
    readSystemPrompt,
    setSystemPrompt,
    workspaces: deps.workspaces,
  };
};
