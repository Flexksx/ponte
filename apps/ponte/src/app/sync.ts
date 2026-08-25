import {
  type Config,
  defaultConfig,
  enabledVendors,
  isSkillEnabledForVendor,
} from "../domain/config";
import type { BuildInput } from "../domain/generation";
import { parseSource } from "../domain/source";
import { parseVendorNames, type VendorName, vendorLayouts } from "../domain/vendor";
import {
  readConfig,
  readPrompt,
  resolveContent,
  writeConfig,
  writePrompt,
} from "../infra/config-file";
import { resolveSource } from "../infra/git";
import {
  configDirectoryPath,
  currentPlatform,
  gitCacheDirectoryPath,
  homeDirectory,
  storeDirectoryPath,
} from "../infra/paths";
import { activate, buildGeneration, hashBuildInput } from "../infra/store";

export type SyncRequest = {
  readonly promptOverride: string | undefined;
  readonly requestedVendors: readonly string[];
};

export type Bootstrap = {
  readonly configDirectory: string;
  readonly systemPromptFile: string;
};

export type SyncReport = {
  readonly hash: string;
  readonly vendors: readonly VendorName[];
  readonly bootstrap: Bootstrap | null;
};

export class MissingSystemPromptError extends Error {
  constructor(filename: string) {
    super(`system prompt not found: ${filename}`);
  }
}

export class NoVendorsEnabledError extends Error {
  constructor() {
    super("no agents enabled in config - run with -a to specify agents");
  }
}

type SyncContext = {
  readonly config: Config;
  readonly prompt: string;
  readonly vendors: readonly VendorName[];
  readonly bootstrap: Bootstrap | null;
};

export const buildInputFor = async (
  config: Config,
  prompt: string,
  vendor: VendorName,
): Promise<BuildInput> => {
  const gitCache = gitCacheDirectoryPath();
  const skills = [];
  for (const [name, entry] of Object.entries(config.skills)) {
    if (!isSkillEnabledForVendor(entry, vendor)) continue;
    const source = parseSource(entry.source, entry.ref, entry.subdir);
    skills.push({ name, sourceDir: await resolveSource(source, gitCache) });
  }
  const subagents = [];
  for (const [name, entry] of Object.entries(config.subagents)) {
    const source = parseSource(entry.source, entry.ref, entry.subdir);
    subagents.push({ name, sourceDir: await resolveSource(source, gitCache) });
  }
  return { prompt, skills, subagents };
};

const bootstrapConfig = async (): Promise<{ config: Config; bootstrap: Bootstrap }> => {
  const config = defaultConfig();
  await writeConfig(config);
  await writePrompt(config.systemPromptFile, "");
  return {
    config,
    bootstrap: {
      configDirectory: configDirectoryPath(),
      systemPromptFile: config.systemPromptFile,
    },
  };
};

const loadContext = async (request: SyncRequest): Promise<SyncContext> => {
  const existing = await readConfig();
  const { config, bootstrap } =
    existing === null ? await bootstrapConfig() : { config: existing, bootstrap: null };

  const prompt =
    request.promptOverride === undefined
      ? await readPrompt(config.systemPromptFile)
      : await resolveContent(request.promptOverride);
  if (prompt === null) throw new MissingSystemPromptError(config.systemPromptFile);

  const vendors =
    request.requestedVendors.length > 0
      ? parseVendorNames(request.requestedVendors)
      : enabledVendors(config);
  if (vendors.length === 0) throw new NoVendorsEnabledError();

  return { config, prompt, vendors, bootstrap };
};

export const planSync = async (request: SyncRequest): Promise<SyncReport> => {
  const { config, prompt, vendors, bootstrap } = await loadContext(request);
  let hash = "";
  for (const vendor of vendors) {
    hash = await hashBuildInput(await buildInputFor(config, prompt, vendor));
  }
  return { hash, vendors, bootstrap };
};

export const runSync = async (request: SyncRequest): Promise<SyncReport> => {
  const { config, prompt, vendors, bootstrap } = await loadContext(request);
  const layouts = vendorLayouts(homeDirectory(), currentPlatform());
  const storeDir = storeDirectoryPath();
  let hash = "";
  for (const vendor of vendors) {
    const generation = await buildGeneration(await buildInputFor(config, prompt, vendor), storeDir);
    hash = generation.hash;
    await activate(generation, layouts[vendor]);
  }
  return { hash, vendors, bootstrap };
};
