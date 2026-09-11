import {
  type ApplyPlan,
  type Config,
  createDefaultConfig,
  err,
  type FileExists,
  getEnabledVendors,
  getStaleLinkPaths,
  ok,
  parseVendorNames,
  type ReadConfig,
  type ReadSymlinks,
  type Result,
  type VendorName,
  type VendorPlan,
  type WriteConfig,
  type WritePrompt,
  type WriteText,
} from "@ponte/core";
import type { BuildVendorPlans } from "./vendor-resolve";

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

type PendingSync = {
  readonly vendors: readonly VendorName[];
  readonly plans: Readonly<Record<VendorName, VendorPlan>>;
  readonly stale: Readonly<Record<string, readonly string[]>>;
  readonly bootstrap: Bootstrap | null;
};

type SyncDeps = {
  readConfig: ReadConfig;
  writeConfig: WriteConfig;
  writePrompt: WritePrompt;
  fileExists: FileExists;
  writeText: WriteText;
  readSymlinks: ReadSymlinks;
  applyPlan: ApplyPlan;
  buildVendorPlans: BuildVendorPlans;
  configDirectory: string;
  overridePromptPath: string;
  resolvePromptPath: (filename: string) => string;
};

const countStale = (pending: PendingSync): number =>
  pending.vendors.reduce(
    (total, vendor) => total + (pending.stale[vendor]?.length ?? 0),
    0,
  );

export const createSyncVendors = (deps: SyncDeps) => {
  const bootstrapConfig = async (): Promise<{
    config: Config;
    bootstrap: Bootstrap;
  }> => {
    const config = createDefaultConfig();
    await deps.writeConfig(config);
    await deps.writePrompt(config.systemPromptFile, "");
    return {
      config,
      bootstrap: {
        configDirectory: deps.configDirectory,
        systemPromptFile: config.systemPromptFile,
      },
    };
  };

  const configuredPromptPath = async (
    config: Config,
  ): Promise<Result<string, string>> => {
    const path = deps.resolvePromptPath(config.systemPromptFile);
    if (!(await deps.fileExists(path))) {
      return err(`system prompt not found: ${config.systemPromptFile}`);
    }
    return ok(path);
  };

  const materializedOverridePath = async (
    override: string,
  ): Promise<string> => {
    if (await deps.fileExists(override)) return override;
    await deps.writeText(deps.overridePromptPath, override);
    return deps.overridePromptPath;
  };

  const pendingSync = async (
    request: SyncRequest,
  ): Promise<Result<PendingSync, string>> => {
    const existing = await deps.readConfig();
    const { config, bootstrap } =
      existing === null
        ? await bootstrapConfig()
        : { config: existing, bootstrap: null };

    const vendors =
      request.requestedVendors.length > 0
        ? parseVendorNames(request.requestedVendors)
        : getEnabledVendors(config);
    if (vendors.length === 0) {
      return err("no agents enabled in config - run with -a to specify agents");
    }

    const promptResult =
      request.promptOverride === undefined
        ? await configuredPromptPath(config)
        : ok(await materializedOverridePath(request.promptOverride));
    if (!promptResult.ok) return promptResult;

    const plans = await deps.buildVendorPlans(config, promptResult.value);
    const stale: Record<string, readonly string[]> = {};
    for (const vendor of vendors) {
      stale[vendor] = getStaleLinkPaths(
        plans[vendor],
        await deps.readSymlinks(plans[vendor]),
      );
    }
    return ok({ vendors, plans, stale, bootstrap });
  };

  return async (
    request: SyncRequest,
    apply: boolean,
  ): Promise<Result<SyncReport, string>> => {
    const result = await pendingSync(request);
    if (!result.ok) return result;
    const pending = result.value;
    if (apply) {
      for (const vendor of pending.vendors) {
        await deps.applyPlan(
          pending.plans[vendor],
          pending.stale[vendor] ?? [],
        );
      }
    }
    return ok({
      vendors: pending.vendors,
      stale: countStale(pending),
      bootstrap: pending.bootstrap,
    });
  };
};
