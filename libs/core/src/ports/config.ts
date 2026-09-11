import type { Config } from "../domain/config";

export type ReadConfig = () => Promise<Config | null>;
export type WriteConfig = (config: Config) => Promise<void>;
export type ReadPrompt = (filename: string) => Promise<string | null>;
export type WritePrompt = (filename: string, content: string) => Promise<void>;
export type ResolveContent = (fileOrLiteral: string) => Promise<string>;
