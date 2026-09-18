export type Link = { readonly path: string; readonly target: string };

export type ResolvedSkill = {
  readonly name: string;
  readonly sourceDirectory: string;
};

export type ResolvedSubagent = {
  readonly sourceDirectory: string;
  readonly files: readonly string[];
};
