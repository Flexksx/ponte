import { parseArgs } from "node:util";
import type { Config, SkillEntry, SubagentEntry } from "../domain/config";
import type { Generation } from "../domain/generation";
import { shortHash } from "../domain/hashing";
import { describeSource, isGitSource, parseSource } from "../domain/source";
import { collectGarbage, planGarbageCollection } from "../app/gc";
import { requireConfig } from "../app/configuration";
import { readStatus, type StatusReport } from "../app/status";
import { planSync, runSync, type SyncReport } from "../app/sync";
import { readSystemPrompt, setSystemPrompt } from "../app/sysprompt";
import manualText from "./manual.md" with { type: "text" };

const NAME_COLUMN = 12;
const FLAG_COLUMN = 7;
const HASH_COLUMN = 12;
const TYPE_COLUMN = 5;

const HELP_FLAGS = new Set(["help", "--help", "-h"]);

const write = (line: string): void => process.stdout.write(line);

const printBootstrap = (report: SyncReport): void => {
  if (report.bootstrap === null) return;
  write(`Initialized ponte config at ${report.bootstrap.configDirectory}\n`);
  write("  config.toml - all vendors enabled, no skills\n");
  write(`  ${report.bootstrap.systemPromptFile} - empty\n\n`);
};

const runSyncCommand = async (args: string[]): Promise<void> => {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "global-instructions": { type: "string", short: "g" },
      agents: { type: "string", short: "a", multiple: true },
      "dry-run": { type: "boolean" },
    },
    allowPositionals: true,
  });
  if (positionals.length > 0) throw new Error(`unexpected argument for sync: ${positionals[0]}`);

  const override = values["global-instructions"];
  const agents = values.agents;
  const request = {
    promptOverride: typeof override === "string" ? override : undefined,
    requestedVendors: Array.isArray(agents) ? agents : [],
  };

  const dryRun = values["dry-run"] === true;
  const report = dryRun ? await planSync(request) : await runSync(request);
  printBootstrap(report);
  const verb = dryRun ? "Dry run - would " : "";
  write(
    `${verb}build generation ${shortHash(report.hash)} and sync to: ${report.vendors.join(", ")}\n`,
  );
};

const printStatus = (report: StatusReport): void => {
  write(`Would-be generation: ${shortHash(report.expectedHash)}\n\n`);
  write(
    `${"VENDOR".padEnd(NAME_COLUMN)}  ${"ENABLED".padEnd(FLAG_COLUMN)}  ${"ACTIVE".padEnd(HASH_COLUMN)}  STATE\n`,
  );
  for (const vendor of report.vendors) {
    const enabled = vendor.enabled ? "yes" : "no";
    const active = vendor.activeHash === null ? "—" : shortHash(vendor.activeHash);
    write(
      `${vendor.name.padEnd(NAME_COLUMN)}  ${enabled.padEnd(FLAG_COLUMN)}  ${active.padEnd(HASH_COLUMN)}  ${vendor.state}\n`,
    );
  }
};

const runStatusCommand = async (args: string[]): Promise<void> => {
  if (args.length > 0) throw new Error(`unexpected argument for status: ${args[0]}`);
  printStatus(await readStatus());
};

const printGcPlan = (verb: string, remove: readonly Generation[], keep: readonly Generation[]) => {
  if (remove.length === 0) {
    write(`Nothing to remove; ${keep.length} generation(s) in use.\n`);
    return;
  }
  write(`${verb} ${remove.length} generation(s), kept ${keep.length} in use:\n`);
  for (const generation of remove) write(`  ${shortHash(generation.hash)}\n`);
};

const runGcCommand = async (args: string[]): Promise<void> => {
  const { values } = parseArgs({
    args,
    options: { "dry-run": { type: "boolean" } },
    allowPositionals: true,
  });
  const dryRun = values["dry-run"] === true;
  const plan = dryRun ? await planGarbageCollection() : await collectGarbage();
  printGcPlan(dryRun ? "Would remove" : "Removed", plan.remove, plan.keep);
};

const printEntries = (noun: "skills" | "subagents", config: Config): void => {
  const entries: Array<[string, SkillEntry | SubagentEntry]> = Object.entries(config[noun]);
  if (entries.length === 0) {
    write(`No ${noun} configured.\n`);
    return;
  }
  const rows = entries.map(([name, entry]) => ({
    name,
    type: isGitSource(entry.source) ? "git" : "local",
    source: describeSource(parseSource(entry.source, entry.ref, entry.subdir)),
  }));
  const width = Math.max(4, ...rows.map(row => row.name.length));
  write(`${"NAME".padEnd(width)}  TYPE  SOURCE\n`);
  for (const row of rows) {
    write(`${row.name.padEnd(width)}  ${row.type.padEnd(TYPE_COLUMN)}  ${row.source}\n`);
  }
};

const runSkillsCommand = async (args: string[]): Promise<void> => {
  if (args.length > 0) throw new Error(`unexpected argument for skills: ${args[0]}`);
  printEntries("skills", await requireConfig());
};

const runSubagentsCommand = async (args: string[]): Promise<void> => {
  if (args.length > 0) throw new Error(`unexpected argument for subagents: ${args[0]}`);
  printEntries("subagents", await requireConfig());
};

const runSyspromptCommand = async (args: string[]): Promise<void> => {
  const [subcommand, argument] = args;
  if (subcommand === "set") {
    if (argument === undefined) {
      throw new Error("missing argument for sysprompt set <file-or-string>");
    }
    await setSystemPrompt(argument);
    write("System prompt updated.\n");
    return;
  }
  if (subcommand !== undefined) {
    throw new Error(`unknown subcommand for sysprompt: ${subcommand}`);
  }
  const prompt = await readSystemPrompt();
  if (prompt === null) {
    process.stderr.write("No system prompt set. Use `ponte sysprompt set <file-or-string>`.\n");
    return;
  }
  write(prompt);
};

const runManualCommand = async (): Promise<void> => {
  write(manualText);
};

const commands: Record<string, (args: string[]) => Promise<void>> = {
  sync: runSyncCommand,
  status: runStatusCommand,
  gc: runGcCommand,
  skills: runSkillsCommand,
  subagents: runSubagentsCommand,
  sysprompt: runSyspromptCommand,
  manual: runManualCommand,
};

const printUsage = (): void => {
  write("Usage: ponte <command>\n\n");
  write("Commands:\n");
  write("  sync       Sync the system prompt, skills, and subagents to configured vendors\n");
  write("  status     Show the active generation per vendor and whether sources have drifted\n");
  write("  gc         Remove store generations no vendor points to\n");
  write("  skills     List the skills declared in config.toml\n");
  write("  subagents  List the subagents declared in config.toml\n");
  write("  sysprompt  Show or manage the global system prompt\n");
  write("  manual     Show the full configuration and usage guide\n");
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const run = async (argv: string[]): Promise<number> => {
  const [commandName, ...args] = argv;
  if (commandName === undefined || HELP_FLAGS.has(commandName)) {
    printUsage();
    return 0;
  }
  const command = commands[commandName];
  if (command === undefined) {
    process.stderr.write(`unknown command: ${commandName}\n`);
    return 2;
  }
  try {
    await command(args);
    return 0;
  } catch (error) {
    process.stderr.write(`${formatError(error)}\n`);
    return 1;
  }
};
