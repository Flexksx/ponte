import type { SourceEntry } from "../source";

export type NamedSkill = { readonly name: string; readonly source: string };

export type ResolvedSkill = {
  readonly name: string;
  readonly sourceDirectory: string;
};

export type SkillRow = {
  readonly name: string | null;
  readonly entry: SourceEntry;
  readonly vendored: boolean;
  readonly commit: string | null;
};

export type SkillProblem =
  | {
      readonly kind: "missing-skill-file";
      readonly source: string;
      readonly directory: string;
    }
  | {
      readonly kind: "missing-frontmatter";
      readonly source: string;
      readonly file: string;
    }
  | {
      readonly kind: "missing-skill-name";
      readonly source: string;
      readonly file: string;
    }
  | {
      readonly kind: "invalid-skill-name";
      readonly source: string;
      readonly name: string;
    }
  | {
      readonly kind: "duplicate-skill-name";
      readonly name: string;
      readonly first: string;
      readonly second: string;
    }
  | {
      readonly kind: "vendored-skill-renamed";
      readonly directory: string;
      readonly name: string;
      readonly declared: string;
    };
