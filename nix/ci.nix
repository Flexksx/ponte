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
          patchShebangs node_modules

          biome lint --error-on-warnings .

          if grep -rnE '^ *(export )?(async )?function ' \
              apps/*/src apps/*/tests libs/*/src libs/*/tests \
              --include='*.ts' --exclude='*.d.ts'; then
            echo "error arrow-functions-only" >&2; exit 1
          fi

          bun run scripts/check-conventions.ts apps/cli/src
          bun run scripts/check-conventions.ts apps/restapi/src
          bun run scripts/check-conventions.ts libs/core/src

          (cd apps/cli && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json)
          (cd apps/restapi && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json)
          (cd libs/core && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json)
          (cd libs/core && ../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json)

          (cd apps/cli && ../../node_modules/.bin/depcruise src --config .dependency-cruiser.jsonc --output-type err-long)
          (cd libs/core && ../../node_modules/.bin/depcruise src --config .dependency-cruiser.jsonc --output-type err-long)

          if grep -rnE '\b(async|await|Promise)\b' libs/core/src/domain --include='*.ts'; then
            echo "error domain-is-synchronous" >&2; exit 1
          fi

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
