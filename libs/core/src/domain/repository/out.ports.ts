import type { Repository } from "./types";

export type ReadRepository = (path: string) => Promise<Repository | null>;
