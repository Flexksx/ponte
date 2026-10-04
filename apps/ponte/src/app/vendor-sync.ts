import {
  type Bootstrap,
  type Config,
  type ConfigStore,
  createDefaultConfig,
  err,
  getStaleLinkPaths,
  type LinkPlan,
  type LinkStore,
  ok,
  type Problem,
  type PromptStore,
  type Result,
  resolveVendors,
  type SyncReport,
  type SyncRequest,
  type VendorName,
} from "@ponte/core";
import type { BuildVendorPlans } from "./vendor-resolve";

export type SyncVendors = (
  request: SyncRequest,
  apply: boolean,
) => Promise<Result<SyncReport, Problem>>;

type PendingSync = {
  readonly vendors: readonly VendorName[];
  readonly plans: Readonly<Record<VendorName, LinkPlan>>;
  readonly stale: Readonly<Record<string, readonly string[]>>;
  readonly bootstrap: Bootstrap | null;
};

type SyncDeps = {
  config: ConfigStore;
  prompts: PromptStore;
  links: LinkStore;
  buildVendorPlans: BuildVendorPlans;
  configDirectory: string;
};

const countStale = (pending: PendingSync): number =>
  pending.vendors.reduce(
    (total, vendor) => total + (pending.stale[vendor]?.length ?? 0),
    0,
  );

export const createSyncVendors = (deps: SyncDeps): SyncVendors => {
  const bootstrapConfig = async (): Promise<{
    config: Config;
    bootstrap: Bootstrap;
  }> => {
    const config = createDefaultConfig();
    await deps.config.write(config);
    await deps.prompts.write(config.systemPromptFile, "");
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
  ): Promise<Result<string, Problem>> => {
    const path = await deps.prompts.locate(config.systemPromptFile);
    return path === null
      ? err({ kind: "prompt-not-found", file: config.systemPromptFile })
      : ok(path);
  };

  // An override is a path when a file exists there, and prompt text when not.
  const overridePromptPath = async (override: string): Promise<string> =>
    (await deps.prompts.isFile(override))
      ? override
      : deps.prompts.writeOverride(override);

  const pendingSync = async (
    request: SyncRequest,
  ): Promise<Result<PendingSync, Problem>> => {
    const existing = await deps.config.read();
    if (!existing.ok) {
      return existing;
    }
    const { config, bootstrap } =
      existing.value === null
        ? await bootstrapConfig()
        : { config: existing.value, bootstrap: null };

    const vendors = resolveVendors(request.requestedVendors, config);
    if (!vendors.ok) {
      return vendors;
    }
    if (vendors.value.length === 0) {
      return err({ kind: "no-vendors-enabled" });
    }

    const promptPath =
      request.promptOverride === undefined
        ? await configuredPromptPath(config)
        : ok(await overridePromptPath(request.promptOverride));
    if (!promptPath.ok) {
      return promptPath;
    }

    const plans = await deps.buildVendorPlans(config, promptPath.value);
    if (!plans.ok) {
      return plans;
    }
    const stale: Record<string, readonly string[]> = {};
    for (const vendor of vendors.value) {
      stale[vendor] = getStaleLinkPaths(
        plans.value[vendor],
        await deps.links.read(plans.value[vendor]),
      );
    }
    return ok({
      vendors: vendors.value,
      plans: plans.value,
      stale,
      bootstrap,
    });
  };

  return async (request, apply) => {
    const result = await pendingSync(request);
    if (!result.ok) {
      return result;
    }
    const pending = result.value;
    if (apply) {
      for (const vendor of pending.vendors) {
        await deps.links.apply(
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
