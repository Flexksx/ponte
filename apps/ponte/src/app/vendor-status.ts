import {
  type Config,
  err,
  type FileExists,
  getVendorState,
  ok,
  type ReadSymlinks,
  type Result,
  VENDORS,
  type VendorName,
  type VendorState,
} from "@ponte/core";
import type { BuildVendorPlans } from "./vendor-resolve";

export type VendorStatus = {
  readonly name: VendorName;
  readonly enabled: boolean;
  readonly linkCount: number;
  readonly state: VendorState;
};

export type StatusReport = {
  readonly promptFile: string;
  readonly vendors: readonly VendorStatus[];
};

type GetStatusReportDeps = {
  fileExists: FileExists;
  readSymlinks: ReadSymlinks;
  buildVendorPlans: BuildVendorPlans;
  resolvePromptPath: (filename: string) => string;
};

export const createGetStatusReport =
  (deps: GetStatusReportDeps) =>
  async (config: Config): Promise<Result<StatusReport, string>> => {
    const promptPath = deps.resolvePromptPath(config.systemPromptFile);
    if (!(await deps.fileExists(promptPath))) {
      return err(`system prompt not found: ${config.systemPromptFile}`);
    }

    const plans = await deps.buildVendorPlans(config, promptPath);
    const vendors: VendorStatus[] = [];
    for (const name of VENDORS) {
      const enabled = config.vendors[name]?.enabled === true;
      const actual = await deps.readSymlinks(plans[name]);
      vendors.push({
        name,
        enabled,
        linkCount: actual.size,
        state: enabled ? getVendorState(plans[name], actual) : "disabled",
      });
    }
    return ok({ promptFile: config.systemPromptFile, vendors });
  };
