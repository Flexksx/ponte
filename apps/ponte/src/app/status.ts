import { classifyVendor, type VendorState } from "../domain/generation";
import { VENDORS, type VendorName, vendorLayouts } from "../domain/vendor";
import { readPrompt } from "../infra/config-file";
import { currentPlatform, homeDirectory, storeDirectoryPath } from "../infra/paths";
import { hashBuildInput, readActiveHash } from "../infra/store";
import { requireConfig } from "./configuration";
import { buildInputFor, MissingSystemPromptError } from "./sync";

export type VendorStatus = {
  readonly name: VendorName;
  readonly enabled: boolean;
  readonly activeHash: string | null;
  readonly state: VendorState;
};

export type StatusReport = {
  readonly expectedHash: string;
  readonly vendors: readonly VendorStatus[];
};

export const readStatus = async (): Promise<StatusReport> => {
  const config = await requireConfig();
  const prompt = await readPrompt(config.systemPromptFile);
  if (prompt === null) throw new MissingSystemPromptError(config.systemPromptFile);

  const layouts = vendorLayouts(homeDirectory(), currentPlatform());
  const storeDir = storeDirectoryPath();

  const vendors: VendorStatus[] = [];
  let expectedHash = "";
  for (const name of VENDORS) {
    const hash = await hashBuildInput(await buildInputFor(config, prompt, name));
    if (expectedHash === "") expectedHash = hash;
    const snapshot = {
      name,
      enabled: config.vendors[name]?.enabled === true,
      activeHash: await readActiveHash(storeDir, layouts[name].instruction),
      expectedHash: hash,
    };
    vendors.push({ ...snapshot, state: classifyVendor(snapshot) });
  }
  return { expectedHash, vendors };
};
