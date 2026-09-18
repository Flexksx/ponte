{
  description = "ponte - CLI to sync skills and instructions for AI agent vendors";

  nixConfig = {
    extra-substituters = ["https://ponte.cachix.org"];
    extra-trusted-public-keys = ["ponte.cachix.org-1:REQfejqCR1XgRu8BkS1LYEq/jTyjUpY4UZX37svuStk="];
  };

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    import-tree.url = "github:vic/import-tree";
    bun2nix.url = "github:nix-community/bun2nix";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake {inherit inputs;} (
      inputs.import-tree [./nix]
    );
}
