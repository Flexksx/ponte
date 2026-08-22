import { parseArgs } from "node:util";
import { VENDORS, type VendorName, isVendor, vendorLayouts, platform } from "./vendors";
import {
  readConfig,
  writeConfig,
  defaultConfig,
  enabledVendors,
  isSkillEnabledForVendor,
  type Config,
  type SkillEntry,
  type SubagentEntry,
} from "./config";
import { readPrompt, writePrompt, resolveContent } from "./prompt";
import { parseSource, resolveSource } from "./sources";
import {
  type BuildInput,
  buildGeneration,
  activate,
  hashBuildInput,
  planGc,
  listGenerations,
  readActiveHash,
  removeGeneration,
} from "./store";
import { shortHash } from "./hash-helpers";
import { storeDirectoryPath, gitCacheDirectoryPath, homeDirectory, configDirectoryPath } from "./paths";
import manualText from "./manual.md" with { type: "text" };

// ---- source resolution into a BuildInput --------------------------------------

async function buildInputFor(
  cfg: Config,
  prompt: string,
  vendor: string,
  gitCache: string,
): Promise<BuildInput> {
  const skills = [];
  for (const [name, entry] of Object.entries(cfg.skills)) {
    if (!isSkillEnabledForVendor(entry, vendor)) continue;
    skills.push({
      name,
      sourceDir: await resolveSource(
        parseSource(entry.source, entry.ref, entry.subdir),
        gitCache,
      ),
    });
  }
  const subagents = [];
  for (const [name, entry] of Object.entries(cfg.subagents)) {
    subagents.push({
      name,
      sourceDir: await resolveSource(
        parseSource(entry.source, entry.ref, entry.subdir),
        gitCache,
      ),
    });
  }
  return { prompt, skills, subagents };
}

// ---- commands ------------------------------------------------------------------

async function runSync(args: string[]): Promise<void> {
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

  let cfg = await readConfig();
  if (cfg === null) {
    cfg = defaultConfig();
    await writeConfig(cfg);
    await writePrompt(cfg.systemPromptFile, "");
    process.stdout.write(`Initialized ponte config at ${configDirectoryPath()}\n`);
    process.stdout.write("  config.toml - all vendors enabled, no skills\n");
    process.stdout.write(`  ${cfg.systemPromptFile} - empty\n\n`);
  }

  const override = values["global-instructions"];
  const prompt = typeof override === "string"
    ? await resolveContent(override)
    : await readPrompt(cfg.systemPromptFile);
  if (prompt === null) {
    throw new Error(`system prompt not found: ${cfg.systemPromptFile}`);
  }

  const requested = values.agents;
  let targets: VendorName[];
  if (Array.isArray(requested) && requested.length > 0) {
    targets = [];
    for (const chunk of requested) {
      for (const raw of chunk.split(",")) {
        const name = raw.trim();
        if (!isVendor(name)) throw new Error(`unknown agent: ${name}`);
        targets.push(name);
      }
    }
  } else {
    targets = enabledVendors(cfg);
    if (targets.length === 0) {
      throw new Error("no agents enabled in config - run with -a to specify agents");
    }
  }

  const gitCache = gitCacheDirectoryPath();
  const storeDir = storeDirectoryPath();
  const layouts = vendorLayouts(homeDirectory(), platform());
  const dry = values["dry-run"] === true;

  let lastHash = "";
  for (const vendor of targets) {
    const input = await buildInputFor(cfg, prompt, vendor, gitCache);
    if (dry) {
      lastHash = await hashBuildInput(input);
    } else {
      const gen = await buildGeneration(input, storeDir);
      lastHash = gen.hash;
      const layout = layouts[vendor];
      await activate(gen, layout.instruction, layout.skills, layout.agents);
    }
  }

  if (dry) {
    process.stdout.write(
      `Dry run - would build generation ${shortHash(lastHash)} and sync to: ${targets.join(", ")}\n`,
    );
  } else {
    process.stdout.write(
      `Synced generation ${shortHash(lastHash)} to: ${targets.join(", ")}\n`,
    );
  }
}

async function runStatus(args: string[]): Promise<void> {
  if (args.length > 0) throw new Error(`unexpected argument for status: ${args[0]}`);
  const cfg = await readConfig();
  if (cfg === null) throw new Error("config not initialized - run `ponte sync` first");
  const prompt = await readPrompt(cfg.systemPromptFile);
  if (prompt === null) throw new Error(`system prompt not found: ${cfg.systemPromptFile}`);

  const gitCache = gitCacheDirectoryPath();
  const storeDir = storeDirectoryPath();
  const layouts = vendorLayouts(homeDirectory(), platform());

  let wouldBe = "";
  const rows = [];
  for (const vendor of VENDORS) {
    const input = await buildInputFor(cfg, prompt, vendor, gitCache);
    const hash = await hashBuildInput(input);
    if (wouldBe === "") wouldBe = hash;
    const active = await readActiveHash(storeDir, layouts[vendor].instruction);
    rows.push({
      name: vendor,
      enabled: cfg.vendors[vendor]?.enabled === true,
      hasActive: active !== null,
      activeHash: active ?? "",
    });
  }

  process.stdout.write(`Would-be generation: ${shortHash(wouldBe)}\n\n`);
  const header = ["VENDOR", "ENABLED", "ACTIVE", "STATE"];
  process.stdout.write(`${header[0].padEnd(12)}  ${header[1].padEnd(7)}  ${header[2].padEnd(12)}  ${header[3]}\n`);
  for (const row of rows) {
    const state = classify(row.enabled, row.hasActive, row.activeHash, wouldBe);
    const enabled = row.enabled ? "yes" : "no";
    const active = row.hasActive ? shortHash(row.activeHash) : "—";
    process.stdout.write(
      `${row.name.padEnd(12)}  ${enabled.padEnd(7)}  ${active.padEnd(12)}  ${state}\n`,
    );
  }
}

async function runGc(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { "dry-run": { type: "boolean" } },
    allowPositionals: true,
  });
  const storeDir = storeDirectoryPath();
  const layouts = vendorLayouts(homeDirectory(), platform());

  const activeHashes = new Set<string>();
  for (const layout of Object.values(layouts)) {
    const hash = await readActiveHash(storeDir, layout.instruction);
    if (hash) activeHashes.add(hash);
  }

  const generations = await listGenerations(storeDir);
  const { remove, keep } = planGc(generations, activeHashes);

  const dry = values["dry-run"] === true;
  if (!dry) {
    for (const gen of remove) await removeGeneration(gen);
  }

  if (remove.length === 0) {
    process.stdout.write(`Nothing to remove; ${keep.length} generation(s) in use.\n`);
    return;
  }
  const verb = dry ? "Would remove" : "Removed";
  process.stdout.write(`${verb} ${remove.length} generation(s), kept ${keep.length} in use:\n`);
  for (const gen of remove) process.stdout.write(`  ${shortHash(gen.hash)}\n`);
}

async function runSkills(args: string[]): Promise<void> {
  if (args.length > 0) throw new Error(`unexpected argument for skills: ${args[0]}`);
  const cfg = await requireConfig();
  printEntries("skills", Object.entries(cfg.skills));
}

async function runSubagents(args: string[]): Promise<void> {
  if (args.length > 0) throw new Error(`unexpected argument for subagents: ${args[0]}`);
  const cfg = await requireConfig();
  printEntries("subagents", Object.entries(cfg.subagents));
}

async function runSysprompt(args: string[]): Promise<void> {
  const cfg = await requireConfig();
  const [sub, arg] = args;
  if (sub === "set") {
    if (arg === undefined) {
      throw new Error("missing argument for sysprompt set <file-or-string>");
    }
    const content = await resolveContent(arg);
    await writePrompt(cfg.systemPromptFile, content);
    process.stdout.write("System prompt updated.\n");
    return;
  }
  if (sub !== undefined) throw new Error(`unknown subcommand for sysprompt: ${sub}`);
  const prompt = await readPrompt(cfg.systemPromptFile);
  if (prompt === null) {
    process.stderr.write("No system prompt set. Use `ponte sysprompt set <file-or-string>`.\n");
    return;
  }
  process.stdout.write(prompt);
}

async function runManual(): Promise<void> {
  process.stdout.write(manualText);
}

// ---- pure helpers ---------------------------------------------------------------

export const classify = (
  enabled: boolean,
  hasActive: boolean,
  activeHash: string,
  wouldBe: string,
): string => {
  if (!enabled) return "disabled";
  if (!hasActive) return "not synced";
  return activeHash === wouldBe ? "in sync" : "drifted";
};

const formatSource = (entry: SkillEntry | SubagentEntry): string => {
  const source = parseSource(entry.source, entry.ref, entry.subdir);
  if (source.type === "local") return source.path;
  let desc = source.url;
  if (source.ref) desc += `@${source.ref}`;
  if (source.subdir) desc += ` (subdir: ${source.subdir})`;
  return desc;
};

const printEntries = (
  noun: string,
  entries: Array<[string, SkillEntry | SubagentEntry]>,
): void => {
  if (entries.length === 0) {
    process.stdout.write(`No ${noun} configured.\n`);
    return;
  }
  const rows = entries.map(([name, entry]) => ({
    name,
    type: /^(https?:\/\/|git@|file:\/\/)/.test(entry.source) ? "git" : "local",
    source: formatSource(entry),
  }));
  const nameWidth = Math.max(4, ...rows.map((r) => r.name.length));
  process.stdout.write(`${"NAME".padEnd(nameWidth)}  TYPE  SOURCE\n`);
  for (const row of rows) {
    process.stdout.write(`${row.name.padEnd(nameWidth)}  ${row.type.padEnd(5)}  ${row.source}\n`);
  }
};

// ---- dispatch -------------------------------------------------------------------

const requireConfig = async () => {
  const cfg = await readConfig();
  if (cfg === null) throw new Error("config not initialized - run `ponte sync` first");
  return cfg;
};

const commands: Record<string, (args: string[]) => Promise<void>> = {
  sync: runSync,
  status: runStatus,
  gc: runGc,
  skills: runSkills,
  subagents: runSubagents,
  sysprompt: runSysprompt,
  manual: runManual,
};

const printUsage = (): void => {
  process.stdout.write("Usage: ponte <command>\n\n");
  process.stdout.write("Commands:\n");
  process.stdout.write("  sync       Sync the system prompt, skills, and subagents to configured vendors\n");
  process.stdout.write("  status     Show the active generation per vendor and whether sources have drifted\n");
  process.stdout.write("  gc         Remove store generations no vendor points to\n");
  process.stdout.write("  skills     List the skills declared in config.toml\n");
  process.stdout.write("  subagents  List the subagents declared in config.toml\n");
  process.stdout.write("  sysprompt  Show or manage the global system prompt\n");
  process.stdout.write("  manual     Show the full configuration and usage guide\n");
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// run dispatches a command and returns a process exit code. All command errors
// are caught here, printed to stderr, and turned into a non-zero exit.
export async function run(argv: string[]): Promise<number> {
  const [commandName, ...args] = argv;
  if (commandName === undefined || commandName === "help" || commandName === "--help" || commandName === "-h") {
    printUsage();
    return 0;
  }
  const command = commands[commandName];
  if (!command) {
    process.stderr.write(`unknown command: ${commandName}\n`);
    return 2;
  }
  try {
    await command(args);
    return 0;
  } catch (error) {
    process.stderr.write(formatError(error) + "\n");
    return 1;
  }
}