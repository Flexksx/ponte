{inputs, ...}: {
  perSystem = {system, ...}: let
    bun2nix = inputs.bun2nix.packages.${system}.default;
    bunDeps = bun2nix.fetchBunDeps {bunNix = ../bun.nix;};
  in {
    packages.default = bun2nix.mkDerivation {
      pname = "ponte";
      version = "0.1.0";
      src = ../.;
      inherit bunDeps;
      module = "apps/cli/src/index.ts";
    };
  };
}
