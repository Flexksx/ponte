import { isAbsolute, join } from "node:path";
import { err, ok, type Result } from "../shared";
import { resolveSourcePaths } from "../source";
import type { VendorName, VendorProblem } from "../vendor";
import { isVendor, parseVendorNames, VENDORS } from "../vendor";
import type {
  Config,
  ConfigIssue,
  RawConfig,
  RawVendorTable,
  VendorConfig,
} from "./types";

const DEFAULT_SYSTEM_PROMPT_FILE = "AGENTS.md";

export const createDefaultConfig = (): Config => ({
  systemPromptFile: DEFAULT_SYSTEM_PROMPT_FILE,
  vendors: Object.fromEntries(
    VENDORS.map(vendor => [vendor, { enabled: true }]),
  ),
  skills: [],
  subagents: [],
});

export const resolveConfigPaths = (
  config: Config,
  configDirectory: string,
): Config => ({
  ...config,
  skills: resolveSourcePaths(config.skills, configDirectory),
  subagents: resolveSourcePaths(config.subagents, configDirectory),
});

export const resolvePromptPath = (
  configDirectory: string,
  filename: string,
): string =>
  isAbsolute(filename) ? filename : join(configDirectory, filename);

export const resolveVendors = (
  requestedVendors: readonly string[],
  config: Config,
): Result<VendorName[], VendorProblem> =>
  requestedVendors.length > 0
    ? parseVendorNames(requestedVendors)
    : ok(VENDORS.filter(vendor => config.vendors[vendor]?.enabled === true));

export const buildVendorTable = (
  raw: RawVendorTable,
  path: string,
): Result<
  Readonly<Partial<Record<VendorName, VendorConfig>>>,
  ConfigIssue[]
> => {
  const vendors: Partial<Record<VendorName, VendorConfig>> = {};
  const issues: ConfigIssue[] = [];
  for (const [name, entry] of Object.entries(raw)) {
    if (isVendor(name)) {
      vendors[name] = { enabled: entry.enabled ?? false };
      continue;
    }
    issues.push({ kind: "unknown-vendor-entry", path, name });
  }
  return issues.length > 0 ? err(issues) : ok(vendors);
};

export const buildConfig = (raw: RawConfig): Result<Config, ConfigIssue[]> => {
  const vendors = buildVendorTable(raw.vendors ?? {}, "vendors");
  return vendors.ok
    ? ok({
        systemPromptFile: raw.system_prompt_file ?? DEFAULT_SYSTEM_PROMPT_FILE,
        vendors: vendors.value,
        skills: raw.skills ?? [],
        subagents: raw.subagents ?? [],
      })
    : vendors;
};
