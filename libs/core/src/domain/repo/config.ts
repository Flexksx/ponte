import { buildVendorTable, type ConfigIssue } from "../config";
import { ok, type Result } from "../shared";
import { resolveSourcePaths } from "../source";
import type { VendorName } from "../vendor";
import { VENDORS } from "../vendor";
import type { RawRepoConfig, RepoConfig } from "./types";

export const REPO_CONFIG_FILE = "ponte.toml";

export const REPO_CONFIG_KEYS = ["vendors", "skills"];

export const getRepoEnabledVendors = (
  config: RepoConfig,
): VendorName[] | undefined => {
  if (config.vendors === undefined) {
    return undefined;
  }
  return VENDORS.filter(name => config.vendors?.[name]?.enabled === true);
};

export const resolveRepoConfigPaths = (
  config: RepoConfig,
  root: string,
): RepoConfig => ({
  ...(config.vendors !== undefined && { vendors: config.vendors }),
  skills: resolveSourcePaths(config.skills, root),
});

export const buildRepoConfig = (
  raw: RawRepoConfig,
): Result<RepoConfig, ConfigIssue[]> => {
  if (raw.vendors === undefined) {
    return ok({ skills: raw.skills ?? [] });
  }
  const vendors = buildVendorTable(raw.vendors, "vendors");
  return vendors.ok
    ? ok({ vendors: vendors.value, skills: raw.skills ?? [] })
    : vendors;
};
