import { type Config, defaultConfig, enabledVendors } from "../domain/config";
import { staleLinkPaths, type VendorPlan } from "../domain/link";
import { parseVendorNames, type VendorName } from "../domain/vendor";
import { readConfig, writeConfig, writePrompt } from "../infra/config-file";
import { fileExists, writeText } from "../infra/filesystem";
import { applyPlan, readSymlinks } from "../infra/links";
import { configDirectoryPath, overridePromptPath, promptFilePath } from "../infra/paths";
import { planVendors } from "./resolve";

export type SyncRequest = {
  readonly promptOverride: string | undefined;
  readonly requestedVendors: readonly string[];
};

export type Bootstrap = {
  readonly configDirectory: string;
  readonly systemPromptFile: string;
};

export type SyncReport = {
  readonly vendors: readonly VendorName[];
  readonly stale: number;
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

type PendingSync = {
  readonly vendors: readonly VendorName[];
  readonly plans: Readonly<Record<VendorName, VendorPlan>>;
  readonly stale: Readonly<Record<string, readonly string[]>>;
  readonly bootstrap: Bootstrap | null;
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

const configuredPromptPath = async (config: Config): Promise<string> => {
  const path = promptFilePath(config.systemPromptFile);
  if (!(await fileExists(path))) throw new MissingSystemPromptError(config.systemPromptFile);
  return path;
};

const materializedOverridePath = async (override: string): Promise<string> => {
  if (await fileExists(override)) return override;
  const path = overridePromptPath();
  await writeText(path, override);
  return path;
};

const pendingSync = async (request: SyncRequest): Promise<PendingSync> => {
  const existing = await readConfig();
  const { config, bootstrap } =
    existing === null ? await bootstrapConfig() : { config: existing, bootstrap: null };

  const vendors =
    request.requestedVendors.length > 0
      ? parseVendorNames(request.requestedVendors)
      : enabledVendors(config);
  if (vendors.length === 0) throw new NoVendorsEnabledError();

  const promptPath =
    request.promptOverride === undefined
      ? await configuredPromptPath(config)
      : await materializedOverridePath(request.promptOverride);
  const plans = await planVendors(config, promptPath);
  const stale: Record<string, readonly string[]> = {};
  for (const vendor of vendors) {
    stale[vendor] = staleLinkPaths(plans[vendor], await readSymlinks(plans[vendor]));
  }
  return { vendors, plans, stale, bootstrap };
};

const countStale = (pending: PendingSync): number =>
  pending.vendors.reduce((total, vendor) => total + (pending.stale[vendor]?.length ?? 0), 0);

export const planSync = async (request: SyncRequest): Promise<SyncReport> => {
  const pending = await pendingSync(request);
  return { vendors: pending.vendors, stale: countStale(pending), bootstrap: pending.bootstrap };
};

export const runSync = async (request: SyncRequest): Promise<SyncReport> => {
  const pending = await pendingSync(request);
  for (const vendor of pending.vendors) {
    await applyPlan(pending.plans[vendor], pending.stale[vendor] ?? []);
  }
  return { vendors: pending.vendors, stale: countStale(pending), bootstrap: pending.bootstrap };
};
