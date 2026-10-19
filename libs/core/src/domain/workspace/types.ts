export type WorkspaceLink = { readonly target: string; readonly note: string };

export type Decision = { readonly date: string; readonly text: string };

export type Workspace = {
  readonly name: string;
  readonly goal: string;
  readonly next: string;
  readonly links: readonly WorkspaceLink[];
  readonly decisions: readonly Decision[];
};

export type WorkspaceEdit =
  | { readonly kind: "link"; readonly target: string; readonly note: string }
  | { readonly kind: "unlink"; readonly target: string }
  | { readonly kind: "decide"; readonly date: string; readonly text: string }
  | { readonly kind: "next"; readonly text: string };

export type WorkspaceProblem =
  | { readonly kind: "invalid-workspace-name"; readonly name: string }
  | { readonly kind: "workspace-exists"; readonly name: string }
  | { readonly kind: "workspace-not-found"; readonly name: string }
  | { readonly kind: "link-not-found"; readonly target: string }
  | {
      readonly kind: "invalid-workspace-file";
      readonly file: string;
      readonly message: string;
    };
