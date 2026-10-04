import { buildVendorTable, type ConfigIssue } from "../config";
import { ok, type Result } from "../shared";
import { resolveSourcePaths } from "../source";
import type { VendorName } from "../vendor";
import { VENDORS } from "../vendor";
import type { ProjectConfig, RawProjectConfig } from "./types";

export const PROJECT_CONFIG_FILE = "ponte.toml";

export const PROJECT_CONFIG_KEYS = ["vendors", "skills"];

export const getProjectEnabledVendors = (
  config: ProjectConfig,
): VendorName[] | undefined => {
  if (config.vendors === undefined) {
    return undefined;
  }
  return VENDORS.filter(name => config.vendors?.[name]?.enabled === true);
};

export const resolveProjectConfigPaths = (
  config: ProjectConfig,
  root: string,
): ProjectConfig => ({
  ...(config.vendors !== undefined && { vendors: config.vendors }),
  skills: resolveSourcePaths(config.skills, root),
});

export const buildProjectConfig = (
  raw: RawProjectConfig,
): Result<ProjectConfig, ConfigIssue[]> => {
  if (raw.vendors === undefined) {
    return ok({ skills: raw.skills ?? [] });
  }
  const vendors = buildVendorTable(raw.vendors, "vendors");
  return vendors.ok
    ? ok({ vendors: vendors.value, skills: raw.skills ?? [] })
    : vendors;
};
