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
} from "@ponte/core";
import type { FindProject } from "./find-project";
import type { ListConfigSkills, ListProjectSkills } from "./project-skills";
import type { GetProjectStatusReport } from "./project-status";
import type { SyncProject } from "./project-sync";
import type { RunProjectUpdate } from "./project-update";
import type { GetStatusReport } from "./vendor-status";
import type { SyncVendors } from "./vendor-sync";

type WorkspaceDeps = {
  findProject: FindProject;
  config: ConfigStore;
  prompts: PromptStore;
  syncProject: SyncProject;
  syncVendors: SyncVendors;
  getProjectStatusReport: GetProjectStatusReport;
  getStatusReport: GetStatusReport;
  listProjectSkills: ListProjectSkills;
  listConfigSkills: ListConfigSkills;
  runProjectUpdate: RunProjectUpdate;
};

// A project directory, one that holds ponte.toml, selects project mode.
// Every other directory selects global mode.
export const createWorkspace = (deps: WorkspaceDeps): App => {
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
    const project = await deps.findProject();
    if (!project.ok) {
      return project;
    }
    if (project.value === null) {
      const report = await deps.syncVendors(request, apply);
      return report.ok ? ok({ mode: "global", report: report.value }) : report;
    }
    if (
      request.promptOverride !== undefined ||
      request.requestedVendors.length > 0
    ) {
      return err({ kind: "global-options-in-project" });
    }
    const report = await deps.syncProject(project.value, apply);
    return report.ok ? ok({ mode: "project", report: report.value }) : report;
  };

  const status: Status = async () => {
    const project = await deps.findProject();
    if (!project.ok) {
      return project;
    }
    if (project.value !== null) {
      const report = await deps.getProjectStatusReport(project.value);
      return report.ok ? ok({ mode: "project", report: report.value }) : report;
    }
    const config = await requireConfig();
    if (!config.ok) {
      return config;
    }
    const report = await deps.getStatusReport(config.value);
    return report.ok ? ok({ mode: "global", report: report.value }) : report;
  };

  const listSkills: ListSkills = async () => {
    const project = await deps.findProject();
    if (!project.ok) {
      return project;
    }
    if (project.value !== null) {
      const rows = await deps.listProjectSkills(project.value);
      return rows.ok ? ok({ mode: "project", rows: rows.value }) : rows;
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
    const project = await deps.findProject();
    if (!project.ok) {
      return project;
    }
    return project.value === null
      ? err({ kind: "not-in-project" })
      : deps.runProjectUpdate(project.value, name, force);
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
  };
};
