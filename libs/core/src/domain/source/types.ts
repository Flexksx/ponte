export type SkillSource =
  | { readonly type: "local"; readonly path: string }
  | {
      readonly type: "git";
      readonly url: string;
      readonly ref: string;
      readonly subdir?: string;
    };

export type SourceEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type SourceProblem =
  | { readonly kind: "missing-git-ref"; readonly url: string }
  | { readonly kind: "source-not-directory"; readonly path: string };
