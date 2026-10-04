import {
  type Config,
  err,
  getLinkState,
  type LinkStore,
  ok,
  type Problem,
  type PromptStore,
  type Result,
  type StatusReport,
  VENDORS,
  type VendorStatus,
} from "@ponte/core";
import type { BuildVendorPlans } from "./vendor-resolve";

export type GetStatusReport = (
  config: Config,
) => Promise<Result<StatusReport, Problem>>;

type GetStatusReportDeps = {
  prompts: PromptStore;
  links: LinkStore;
  buildVendorPlans: BuildVendorPlans;
};

export const createGetStatusReport =
  (deps: GetStatusReportDeps): GetStatusReport =>
  async config => {
    const promptPath = await deps.prompts.locate(config.systemPromptFile);
    if (promptPath === null) {
      return err({ kind: "prompt-not-found", file: config.systemPromptFile });
    }

    const plans = await deps.buildVendorPlans(config, promptPath);
    if (!plans.ok) {
      return plans;
    }
    const vendors: VendorStatus[] = [];
    for (const name of VENDORS) {
      const plan = plans.value[name];
      const enabled = config.vendors[name]?.enabled === true;
      const actual = await deps.links.read(plan);
      vendors.push({
        name,
        enabled,
        linkCount: actual.size,
        state: enabled ? getLinkState(plan, actual) : "disabled",
      });
    }
    return ok({ promptFile: config.systemPromptFile, vendors });
  };
