import type { VendorPlan } from "../domain/plan";

export type ReadSymlinks = (plan: VendorPlan) => Promise<Map<string, string>>;
export type ApplyPlan = (
  plan: VendorPlan,
  stale: readonly string[],
) => Promise<void>;
