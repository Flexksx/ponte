import { parseArgs } from "node:util";
import { MCP_ROUTE } from "@ponte/api-client/routes";
import {
  type App,
  describeDirectoryMatch,
  describeSessions,
  describeSourceEntry,
  describeWorkspace,
  isGitSource,
  type LinkState,
  type Problem,
  REPO_SKILLS_DIRECTORY,
  REPO_SOURCES_DIRECTORY,
  type RepoStatusReport,
  type RepoSyncReport,
  type Result,
  type SkillRow,
  type SourceEntry,
  type StatusReport,
  type SyncReport,
  type Workspace,
} from "@ponte/core";
import chalk from "chalk";
import { serve } from "../server/http";
import { formatShortCommit } from "./format";
import manualText from "./manual.md" with { type: "text" };
import { describeProblem } from "./problems";

type Command = {
  readonly name: string;
  readonly summary: string;
  readonly run: (args: string[]) => Promise<void>;
};

const FLAG_COLUMN = 7;
const LINKS_COLUMN = 5;
const TYPE_COLUMN = 5;
const KIND_COLUMN = 8;
const COMMIT_COLUMN = 7;
const NO_VALUE = "—";
const DEFAULT_SERVE_PORT = 4774;

const WORKSPACE_USAGE = `Usage:
  ponte ws                               list workspaces
  ponte ws show [name]                   print a workspace, by default the one linked to this folder
  ponte ws new <name> <goal>             create a workspace
  ponte ws link <name> <target> [note]   add a URL or a path, or change its note
  ponte ws unlink <name> <target>        remove a link
  ponte ws decide <name> <text>          record a dated decision
  ponte ws next <name> <text>            replace the next step
  ponte ws sessions <name>               list the agent sessions that ran in its folders`;

const HELP_FLAGS = new Set(["help", "--help", "-h"]);

const STATE_STYLES: Record<LinkState, (text: string) => string> = {
  "in sync": chalk.green,
  drifted: chalk.yellow,
  "not synced": chalk.red,
  disabled: chalk.dim,
};

const write = (line: string): void => process.stdout.write(line);

export const warn = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

const unwrap = <T>(result: Result<T, Problem>): T => {
  if (!result.ok) {
    throw new Error(describeProblem(result.error));
  }
  return result.value;
};

const printBootstrap = (report: SyncReport): void => {
  if (report.bootstrap === null) {
    return;
  }
  write(`Initialized ponte config at ${report.bootstrap.configDirectory}\n`);
  write("  config.toml - all vendors enabled, no skills\n");
  write(`  ${report.bootstrap.systemPromptFile} - empty\n\n`);
};

const printStale = (stale: number, dryRun: boolean): void => {
  if (stale === 0) {
    return;
  }
  const removal = dryRun ? "would be removed" : "removed";
  write(`${chalk.dim(`${stale} stale link(s) ${removal}.`)}\n`);
};

const printRepoSync = (report: RepoSyncReport, dryRun: boolean): void => {
  const verb = dryRun ? "Dry run - would sync repo" : "Synced repo";
  write(`${verb} ${chalk.cyan(report.root)}\n`);
  if (report.vendored > 0) {
    const action = dryRun ? "would be vendored into" : "vendored into";
    write(
      `${report.vendored} skill(s) ${action} ${chalk.cyan(REPO_SOURCES_DIRECTORY)}\n`,
    );
  }
  const linked = dryRun ? "Would link" : "Linked";
  write(
    `${linked} ${report.linked} skill(s) into ${chalk.cyan(REPO_SKILLS_DIRECTORY)}\n`,
  );
  printStale(report.stale, dryRun);
};

const runSyncCommand = async (app: App, args: string[]): Promise<void> => {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "global-instructions": { type: "string", short: "g" },
      agents: { type: "string", short: "a", multiple: true },
      "dry-run": { type: "boolean" },
    },
    allowPositionals: true,
  });
  if (positionals.length > 0) {
    throw new Error(`unexpected argument for sync: ${positionals[0]}`);
  }

  const override = values["global-instructions"];
  const agents = values.agents;
  const dryRun = values["dry-run"] === true;

  const request = {
    promptOverride: typeof override === "string" ? override : undefined,
    requestedVendors: Array.isArray(agents) ? agents : [],
  };
  const outcome = unwrap(await app.sync(request, !dryRun));
  if (outcome.mode === "repo") {
    printRepoSync(outcome.report, dryRun);
    return;
  }
  printBootstrap(outcome.report);
  const verb = dryRun ? "Dry run - would link" : "Linked";
  write(`${verb} to: ${outcome.report.vendors.join(", ")}\n`);
  printStale(outcome.report.stale, dryRun);
};

const printStatus = (report: StatusReport): void => {
  write(`System prompt: ${chalk.cyan(report.promptFile)}\n\n`);
  const width = Math.max(
    "VENDOR".length,
    ...report.vendors.map(vendor => vendor.name.length),
  );
  write(
    `${chalk.bold(
      `${"VENDOR".padEnd(width)}  ${"ENABLED".padEnd(FLAG_COLUMN)}  ${"LINKS".padEnd(LINKS_COLUMN)}  STATE`,
    )}\n`,
  );
  for (const vendor of report.vendors) {
    const enabled = vendor.enabled
      ? chalk.green("yes".padEnd(FLAG_COLUMN))
      : chalk.dim("no".padEnd(FLAG_COLUMN));
    const links =
      vendor.linkCount === 0
        ? chalk.dim("—".padEnd(LINKS_COLUMN))
        : chalk.cyan(String(vendor.linkCount).padEnd(LINKS_COLUMN));
    write(
      `${vendor.name.padEnd(width)}  ${enabled}  ${links}  ${STATE_STYLES[vendor.state](vendor.state)}\n`,
    );
  }
};

const printRepoStatus = (report: RepoStatusReport): void => {
  write(`Repo:    ${chalk.cyan(report.root)}\n`);
  write(`Skills:  ${chalk.cyan(report.skillsDirectory)}\n\n`);
  const links =
    report.linkCount === 0
      ? chalk.dim("0")
      : chalk.cyan(String(report.linkCount));
  write(`${links} link(s) - ${STATE_STYLES[report.state](report.state)}\n`);
};

const runStatusCommand = async (app: App, args: string[]): Promise<void> => {
  if (args.length > 0) {
    throw new Error(`unexpected argument for status: ${args[0]}`);
  }
  const outcome = unwrap(await app.status());
  if (outcome.mode === "repo") {
    printRepoStatus(outcome.report);
    return;
  }
  printStatus(outcome.report);
};

const nameColumn = (rows: readonly SkillRow[]): number =>
  Math.max(4, ...rows.map(row => (row.name ?? NO_VALUE).length));

const nameCell = (name: string | null, width: number): string =>
  name === null ? chalk.dim(NO_VALUE.padEnd(width)) : name.padEnd(width);

const printConfigSkills = (rows: readonly SkillRow[]): void => {
  if (rows.length === 0) {
    write("No skills configured.\n");
    return;
  }
  const width = nameColumn(rows);
  write(
    `${chalk.bold(`${"NAME".padEnd(width)}  ${"TYPE".padEnd(TYPE_COLUMN)}  SOURCE`)}\n`,
  );
  for (const row of rows) {
    const type = row.vendored ? "git" : "local";
    write(
      `${nameCell(row.name, width)}  ${chalk.dim(type.padEnd(TYPE_COLUMN))}  ${describeSourceEntry(row.entry)}\n`,
    );
  }
};

const printSubagents = (entries: readonly SourceEntry[]): void => {
  if (entries.length === 0) {
    write("No subagents configured.\n");
    return;
  }
  write(`${chalk.bold("TYPE   SOURCE")}\n`);
  for (const entry of entries) {
    const type = isGitSource(entry.source) ? "git" : "local";
    write(
      `${chalk.dim(type.padEnd(TYPE_COLUMN))}  ${describeSourceEntry(entry)}\n`,
    );
  }
};

const printRepoSkills = (rows: readonly SkillRow[]): void => {
  if (rows.length === 0) {
    write("No skills configured.\n");
    return;
  }
  const width = nameColumn(rows);
  write(
    `${chalk.bold(
      `${"NAME".padEnd(width)}  ${"KIND".padEnd(KIND_COLUMN)}  ${"COMMIT".padEnd(COMMIT_COLUMN)}  SOURCE`,
    )}\n`,
  );
  for (const row of rows) {
    const kind = row.vendored ? "vendored" : "local";
    const commit =
      row.commit === null ? NO_VALUE : formatShortCommit(row.commit);
    write(
      `${nameCell(row.name, width)}  ${chalk.dim(kind.padEnd(KIND_COLUMN))}  ${chalk.dim(commit.padEnd(COMMIT_COLUMN))}  ${describeSourceEntry(row.entry)}\n`,
    );
  }
};

const runSkillsCommand = async (app: App, args: string[]): Promise<void> => {
  if (args.length > 0) {
    throw new Error(`unexpected argument for skills: ${args[0]}`);
  }
  const listing = unwrap(await app.listSkills());
  if (listing.mode === "repo") {
    printRepoSkills(listing.rows);
    return;
  }
  printConfigSkills(listing.rows);
};

const runUpdateCommand = async (app: App, args: string[]): Promise<void> => {
  const { values, positionals } = parseArgs({
    args,
    options: { force: { type: "boolean" } },
    allowPositionals: true,
  });
  if (positionals.length > 1) {
    throw new Error(`unexpected argument for update: ${positionals[1]}`);
  }
  const report = unwrap(
    await app.updateSkills(positionals[0], values.force === true),
  );
  if (report.updated.length === 0) {
    write("No vendored skills to update.\n");
    return;
  }
  write(
    `Updated ${report.updated.length} skill(s) in ${chalk.cyan(report.root)}\n`,
  );
  for (const skill of report.updated) {
    const commit =
      skill.commit === null ? NO_VALUE : formatShortCommit(skill.commit);
    write(`  ${skill.name} -> ${chalk.dim(commit)}\n`);
  }
};

const runSubagentsCommand = async (app: App, args: string[]): Promise<void> => {
  if (args.length > 0) {
    throw new Error(`unexpected argument for subagents: ${args[0]}`);
  }
  printSubagents(unwrap(await app.listSubagents()));
};

const runSyspromptCommand = async (app: App, args: string[]): Promise<void> => {
  const [subcommand, argument] = args;
  if (subcommand === "set") {
    if (argument === undefined) {
      throw new Error("missing argument for sysprompt set <file-or-string>");
    }
    unwrap(await app.setSystemPrompt(argument));
    write("System prompt updated.\n");
    return;
  }
  if (subcommand !== undefined) {
    throw new Error(`unknown subcommand for sysprompt: ${subcommand}`);
  }
  write(unwrap(await app.readSystemPrompt()));
};

const recordHint = (name: string): string =>
  `\nRecord changes with: ponte ws link|unlink|decide|next ${name} ...\n`;

const printWorkspaceList = (workspaces: readonly Workspace[]): void => {
  if (workspaces.length === 0) {
    write("No workspaces. Create one with: ponte ws new <name> <goal>\n");
    return;
  }
  const width = Math.max(...workspaces.map(workspace => workspace.name.length));
  for (const workspace of workspaces) {
    write(`${workspace.name.padEnd(width)}  ${chalk.dim(workspace.goal)}\n`);
  }
};

const showWorkspace = async (app: App, name: string): Promise<void> => {
  write(describeWorkspace(unwrap(await app.workspaces.show(name))));
  write(recordHint(name));
};

const showCurrentWorkspace = async (app: App): Promise<void> => {
  const all = unwrap(await app.workspaces.list());
  const matches = unwrap(await app.workspaces.forDirectory(process.cwd()));
  write(describeDirectoryMatch(matches, all));
  const [only] = matches;
  if (matches.length === 1 && only !== undefined) {
    write(recordHint(only.name));
  }
};

const requireArgument = (
  value: string | undefined,
  what: string,
  subcommand: string,
): string => {
  if (value === undefined || value === "") {
    throw new Error(`missing ${what} for ws ${subcommand}\n${WORKSPACE_USAGE}`);
  }
  return value;
};

const runWorkspaceAction = async (
  app: App,
  subcommand: string,
  name: string,
  rest: readonly string[],
): Promise<void> => {
  const [first, ...more] = rest;
  const text = rest.join(" ");
  switch (subcommand) {
    case "new":
      unwrap(
        await app.workspaces.create(
          name,
          requireArgument(text, "<goal>", subcommand),
        ),
      );
      write(`Created workspace ${name}.\n`);
      return;
    case "link": {
      const target = requireArgument(first, "<target>", subcommand);
      unwrap(await app.workspaces.link(name, target, more.join(" ")));
      write(`${name}: linked ${target}\n`);
      return;
    }
    case "unlink": {
      const target = requireArgument(first, "<target>", subcommand);
      unwrap(await app.workspaces.unlink(name, target));
      write(`${name}: unlinked ${target}\n`);
      return;
    }
    case "decide":
      unwrap(
        await app.workspaces.decide(
          name,
          requireArgument(text, "<text>", subcommand),
        ),
      );
      write(`${name}: recorded decision: ${text}\n`);
      return;
    case "next":
      unwrap(
        await app.workspaces.setNext(
          name,
          requireArgument(text, "<text>", subcommand),
        ),
      );
      write(`${name}: next step: ${text}\n`);
      return;
    case "sessions":
      write(
        `${describeSessions(unwrap(await app.workspaces.sessions(name)))}\n`,
      );
      return;
    default:
      throw new Error(
        `unknown subcommand for ws: ${subcommand}\n${WORKSPACE_USAGE}`,
      );
  }
};

const runWorkspaceCommand = async (app: App, args: string[]): Promise<void> => {
  const [subcommand, name, ...rest] = args;
  if (subcommand === undefined || subcommand === "list") {
    printWorkspaceList(unwrap(await app.workspaces.list()));
    return;
  }
  if (subcommand === "show") {
    await (name === undefined
      ? showCurrentWorkspace(app)
      : showWorkspace(app, name));
    return;
  }
  await runWorkspaceAction(
    app,
    subcommand,
    requireArgument(name, "<name>", subcommand),
    rest,
  );
};

const runServeCommand = async (app: App, args: string[]): Promise<void> => {
  const { values, positionals } = parseArgs({
    args,
    options: { port: { type: "string", short: "p" } },
    allowPositionals: true,
  });
  if (positionals.length > 0) {
    throw new Error(`unexpected argument for serve: ${positionals[0]}`);
  }
  const port =
    typeof values.port === "string" ? Number(values.port) : DEFAULT_SERVE_PORT;
  if (!Number.isInteger(port)) {
    throw new Error(`invalid port: ${values.port}`);
  }
  const url = serve(app, port);
  write(`Web page: ${chalk.cyan(url)}\n`);
  write(`MCP:      ${chalk.cyan(new URL(MCP_ROUTE, url).href)}\n`);
  write(chalk.dim("Ctrl-C stops the server.\n"));
  await new Promise<never>(() => {});
};

const runManualCommand = async (): Promise<void> => {
  write(manualText);
};

const commandTable = (app: App): readonly Command[] => [
  {
    name: "sync",
    summary:
      "Link the system prompt, skills, and subagents into configured vendors",
    run: args => runSyncCommand(app, args),
  },
  {
    name: "status",
    summary:
      "Show which vendors are linked and whether the links match the config",
    run: args => runStatusCommand(app, args),
  },
  {
    name: "skills",
    summary:
      "List the declared skills, from ponte.toml in a repo or from config.toml",
    run: args => runSkillsCommand(app, args),
  },
  {
    name: "update",
    summary: "Re-vendor repo skills from their sources (repo mode only)",
    run: args => runUpdateCommand(app, args),
  },
  {
    name: "subagents",
    summary: "List the subagents declared in config.toml",
    run: args => runSubagentsCommand(app, args),
  },
  {
    name: "sysprompt",
    summary: "Show or manage the global system prompt",
    run: args => runSyspromptCommand(app, args),
  },
  {
    name: "ws",
    summary: "List, show and update workspaces, the context agents share",
    run: args => runWorkspaceCommand(app, args),
  },
  {
    name: "serve",
    summary:
      "Serve the web page, its REST API and the MCP endpoint on 127.0.0.1",
    run: args => runServeCommand(app, args),
  },
  {
    name: "manual",
    summary: "Show the full configuration and usage guide",
    run: runManualCommand,
  },
];

const printUsage = (commands: readonly Command[]): void => {
  const width = Math.max(...commands.map(c => c.name.length));
  write(`Usage: ${chalk.bold("ponte")} <command>\n\n`);
  write(`${chalk.bold("Commands:")}\n`);
  for (const command of commands) {
    write(`  ${chalk.bold(command.name.padEnd(width))}  ${command.summary}\n`);
  }
};

const disableColorIfRequested = (): void => {
  if ((Bun.env.NO_COLOR ?? "") !== "") {
    chalk.level = 0;
  }
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const run = async (app: App, argv: string[]): Promise<number> => {
  disableColorIfRequested();
  const [commandName, ...args] = argv;

  const commands = commandTable(app);

  if (commandName === undefined || HELP_FLAGS.has(commandName)) {
    printUsage(commands);
    return 0;
  }

  const command = commands.find(candidate => candidate.name === commandName);
  if (command === undefined) {
    process.stderr.write(`${chalk.red(`unknown command: ${commandName}`)}\n`);
    return 2;
  }
  try {
    await command.run(args);
    return 0;
  } catch (error) {
    process.stderr.write(`${chalk.red(formatError(error))}\n`);
    return 1;
  }
};
