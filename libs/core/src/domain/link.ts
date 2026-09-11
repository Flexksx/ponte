export type Link = { readonly path: string; readonly target: string };

export type ResolvedEntry = {
  readonly name: string;
  readonly sourceDirectory: string;
  readonly files: readonly string[];
};
