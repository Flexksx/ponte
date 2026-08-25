import type { VendorName } from "./vendor";

export const BUILD_SUFFIX = ".build";

const SEPARATOR = /[/\\]/;

export type ResolvedSkill = { readonly name: string; readonly sourceDir: string };
export type ResolvedSubagent = { readonly name: string; readonly sourceDir: string };

export type BuildInput = {
  readonly prompt: string;
  readonly skills: readonly ResolvedSkill[];
  readonly subagents: readonly ResolvedSubagent[];
};

export type Generation = { readonly hash: string; readonly rootPath: string };

export type GarbageCollectionPlan = {
  readonly remove: readonly Generation[];
  readonly keep: readonly Generation[];
};

export type VendorState = "in sync" | "drifted" | "not synced" | "disabled";

export type VendorSnapshot = {
  readonly name: VendorName;
  readonly enabled: boolean;
  readonly activeHash: string | null;
  readonly expectedHash: string;
};

export const hashFromStorePath = (storeDir: string, target: string): string | null => {
  const root = storeDir.replace(/[/\\]+$/, "");
  if (!target.startsWith(root)) return null;
  const rest = target.slice(root.length);
  if (!SEPARATOR.test(rest.charAt(0))) return null;
  const hash = rest.slice(1).split(SEPARATOR)[0] ?? "";
  if (hash === "" || hash === "." || hash === "..") return null;
  return hash;
};

export const planGc = (
  generations: readonly Generation[],
  activeHashes: ReadonlySet<string>,
): GarbageCollectionPlan => {
  const remove: Generation[] = [];
  const keep: Generation[] = [];
  for (const generation of generations) {
    (activeHashes.has(generation.hash) ? keep : remove).push(generation);
  }
  return { remove, keep };
};

export const classifyVendor = (snapshot: VendorSnapshot): VendorState => {
  if (!snapshot.enabled) return "disabled";
  if (snapshot.activeHash === null) return "not synced";
  return snapshot.activeHash === snapshot.expectedHash ? "in sync" : "drifted";
};
