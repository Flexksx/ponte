import { type GarbageCollectionPlan, planGc } from "../domain/generation";
import { vendorLayouts } from "../domain/vendor";
import { currentPlatform, homeDirectory, storeDirectoryPath } from "../infra/paths";
import { listGenerations, readActiveHash, removeGeneration } from "../infra/store";

export const planGarbageCollection = async (): Promise<GarbageCollectionPlan> => {
  const storeDir = storeDirectoryPath();
  const layouts = vendorLayouts(homeDirectory(), currentPlatform());
  const activeHashes = new Set<string>();
  for (const layout of Object.values(layouts)) {
    const hash = await readActiveHash(storeDir, layout.instruction);
    if (hash !== null) activeHashes.add(hash);
  }
  return planGc(await listGenerations(storeDir), activeHashes);
};

export const collectGarbage = async (): Promise<GarbageCollectionPlan> => {
  const plan = await planGarbageCollection();
  for (const generation of plan.remove) await removeGeneration(generation);
  return plan;
};
