{inputs, ...}: {
  perSystem = {
    pkgs,
    lib,
    self',
    system,
    ...
  }: let
    bun2nix = inputs.bun2nix.packages.${system}.default;
    bunDeps = bun2nix.fetchBunDeps {bunNix = ../bun.nix;};
  in {
    checks = {
      format-ts = pkgs.stdenv.mkDerivation {
        name = "check-format-ts";
        src = ../.;
        nativeBuildInputs = [pkgs.biome];
        dontConfigure = true;
        buildPhase = "biome check --error-on-warnings";
        installPhase = "touch $out";
      };

      format-nix = pkgs.stdenv.mkDerivation {
        name = "check-format-nix";
        src = ../.;
        nativeBuildInputs = [pkgs.alejandra];
        dontConfigure = true;
        buildPhase = "alejandra --check .";
        installPhase = "touch $out";
      };

      format-md = pkgs.stdenv.mkDerivation {
        name = "check-format-md";
        src = ../.;
        nativeBuildInputs = [pkgs.rumdl];
        dontConfigure = true;
        buildPhase = "rumdl check .";
        installPhase = "touch $out";
      };

      lint = pkgs.stdenv.mkDerivation {
        name = "check-lint";
        src = ../.;
        nativeBuildInputs = [pkgs.biome pkgs.bun pkgs.nodejs bun2nix.hook];
        inherit bunDeps;
        dontUseBunBuild = true;
        dontUseBunCheck = true;
        buildPhase = ''
          runHook preBuild
          patchShebangs node_modules apps/ponte/node_modules
          bash ./scripts/lint.sh
          runHook postBuild
        '';
        installPhase = "touch $out";
      };

      package = pkgs.runCommand "check-package" {} ''
        ${self'.packages.default}/bin/ponte --help > /dev/null
        touch $out
      '';
    };
  };
}
