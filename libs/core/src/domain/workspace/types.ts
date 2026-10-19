import type { Repository } from "../repository";

export type WorkspaceLink = { readonly target: string; readonly note: string };

export type Decision = { readonly date: string; readonly text: string };

export type Workspace = {
  readonly name: string;
  readonly goal: string;
  readonly next: string;
  readonly tags: readonly string[];
  readonly doneOn: string | null;
  readonly links: readonly WorkspaceLink[];
  readonly decisions: readonly Decision[];
};

export type WorkspaceOverview = {
  readonly workspace: Workspace;
  readonly repositories: readonly Repository[];
  readonly lastActiveAt: string | null;
};

export type WorkspaceEdit =
  | { readonly kind: "link"; readonly target: string; readonly note: string }
  | { readonly kind: "unlink"; readonly target: string }
  | { readonly kind: "decide"; readonly date: string; readonly text: string }
  | { readonly kind: "next"; readonly text: string }
  | { readonly kind: "tag"; readonly tag: string }
  | { readonly kind: "untag"; readonly tag: string }
  | { readonly kind: "done"; readonly date: string }
  | { readonly kind: "reopen" };

export type WorkspaceProblem =
  | { readonly kind: "invalid-workspace-name"; readonly name: string }
  | { readonly kind: "workspace-exists"; readonly name: string }
  | { readonly kind: "workspace-not-found"; readonly name: string }
  | { readonly kind: "link-not-found"; readonly target: string }
  | { readonly kind: "invalid-tag"; readonly tag: string }
  | { readonly kind: "tag-not-found"; readonly tag: string }
  | { readonly kind: "workspace-already-done"; readonly name: string }
  | { readonly kind: "workspace-not-done"; readonly name: string }
  | {
      readonly kind: "invalid-workspace-file";
      readonly file: string;
      readonly message: string;
    };
