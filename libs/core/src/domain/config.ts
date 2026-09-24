import { isAbsolute, join } from "node:path";
import { err, ok, type Result } from "./result";
import { describeSource, isGitSource, parseSource } from "./source";
import { isVendor, parseVendorNames, VENDORS, type VendorName } from "./vendor";

export type VendorConfig = { readonly enabled: boolean };

export type SourceEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type RawVendorTable = Readonly<
  Record<string, { readonly enabled?: boolean }>
>;

export type RawConfig = {
  readonly system_prompt_file?: string;
  readonly vendors?: RawVendorTable;
  readonly skills?: readonly SourceEntry[];
  readonly subagents?: readonly SourceEntry[];
};

export type Config = {
  readonly systemPromptFile: string;
  readonly vendors: Readonly<Partial<Record<VendorName, VendorConfig>>>;
  readonly skills: readonly SourceEntry[];
  readonly subagents: readonly SourceEntry[];
};

export const DEFAULT_SYSTEM_PROMPT_FILE = "AGENTS.md";

export const createDefaultConfig = (): Config => ({
  systemPromptFile: DEFAULT_SYSTEM_PROMPT_FILE,
  vendors: Object.fromEntries(
    VENDORS.map(vendor => [vendor, { enabled: true }]),
  ),
  skills: [],
  subagents: [],
});

export const describeSourceEntry = (entry: SourceEntry): string =>
  describeSource(parseSource(entry.source, entry.ref, entry.subdir));

export const sourceKey = (entry: {
  readonly source: string;
  readonly subdir?: string;
}): string => `${entry.source}\n${entry.subdir ?? ""}`;

export const resolveSourcePaths = (
  entries: readonly SourceEntry[],
  configDirectory: string,
): SourceEntry[] =>
  entries.map(entry =>
    isGitSource(entry.source) || isAbsolute(entry.source)
      ? entry
      : { ...entry, source: join(configDirectory, entry.source) },
  );

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
): VendorName[] =>
  requestedVendors.length > 0
    ? parseVendorNames(requestedVendors)
    : VENDORS.filter(vendor => config.vendors[vendor]?.enabled === true);

export const buildVendorTable = (
  raw: Readonly<Record<string, { readonly enabled?: boolean }>>,
  path: string,
): Result<Readonly<Partial<Record<VendorName, VendorConfig>>>, string[]> => {
  const vendors: Partial<Record<VendorName, VendorConfig>> = {};
  const problems: string[] = [];
  for (const [name, entry] of Object.entries(raw)) {
    if (isVendor(name)) {
      vendors[name] = { enabled: entry.enabled ?? false };
      continue;
    }
    problems.push(
      `${path}.${name}: unknown agent, expected one of ${VENDORS.join(", ")}`,
    );
  }
  return problems.length > 0 ? err(problems) : ok(vendors);
};

export const buildConfig = (raw: RawConfig): Result<Config, string[]> => {
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
