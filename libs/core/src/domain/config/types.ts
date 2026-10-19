import type { SourceEntry } from "../source";
import type { VendorName } from "../vendor";

export type VendorConfig = { readonly enabled: boolean };

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

export type ConfigIssue =
  | {
      readonly kind: "schema";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "unknown-vendor-entry";
      readonly path: string;
      readonly name: string;
    };

export type ConfigProblem =
  | { readonly kind: "invalid-config"; readonly issues: readonly ConfigIssue[] }
  | { readonly kind: "no-config" }
  | { readonly kind: "prompt-not-found"; readonly file: string }
  | { readonly kind: "no-prompt" };

export type DirectoriesInput = {
  readonly home: string;
  readonly configHome?: string;
  readonly dataHome?: string;
  readonly cacheHome?: string;
};

export type PontePaths = {
  readonly config: string;
  readonly configFile: string;
  readonly overridePrompt: string;
  readonly sourceCache: string;
  readonly workspaces: string;
};
