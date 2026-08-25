import { classifyVendor, type VendorState } from "../domain/link";
import { VENDORS, type VendorName } from "../domain/vendor";
import { fileExists } from "../infra/filesystem";
import { readSymlinks } from "../infra/links";
import { promptFilePath } from "../infra/paths";
import { requireConfig } from "./configuration";
import { planVendors } from "./resolve";
import { MissingSystemPromptError } from "./sync";

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

export const readStatus = async (): Promise<StatusReport> => {
  const config = await requireConfig();
  const promptPath = promptFilePath(config.systemPromptFile);
  if (!(await fileExists(promptPath))) {
    throw new MissingSystemPromptError(config.systemPromptFile);
  }

  const plans = await planVendors(config, promptPath);
  const vendors: VendorStatus[] = [];
  for (const name of VENDORS) {
    const enabled = config.vendors[name]?.enabled === true;
    const actual = await readSymlinks(plans[name]);
    vendors.push({
      name,
      enabled,
      linkCount: actual.size,
      state: enabled ? classifyVendor(plans[name], actual) : "disabled",
    });
  }
  return { promptFile: config.systemPromptFile, vendors };
};
