{...}: {
  perSystem = {
    pkgs,
    lib,
    self',
    ...
  }: let
    bun = pkgs.bun;

    devDeps = pkgs.stdenv.mkDerivation {
      name = "ponte-dev-deps";
      version = "0.1.0";
      src = ../.;
      nativeBuildInputs = [bun pkgs.cacert];
      dontConfigure = true;
      buildPhase = ''
        runHook preBuild
        export HOME="$TMPDIR"
        export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
        bun install --frozen-lockfile --no-progress
        runHook postBuild
      '';
      installPhase = ''
        runHook preInstall
        mkdir -p $out
        for dir in . apps/ponte libs/core; do
          if [ -d "$dir/node_modules" ]; then
            mkdir -p "$out/$dir"
            cp -R "$dir/node_modules" "$out/$dir/"
          fi
        done
        runHook postInstall
      '';
      dontFixup = true;
      outputHashMode = "recursive";
      outputHashAlgo = "sha256";
      outputHash = "sha256-H3jmxpb2lwK5NZB7F9YuOIc9EFM6iOSIjQGkmTpD5tU=";
    };
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
        nativeBuildInputs = [pkgs.biome bun pkgs.nodejs];
        dontConfigure = true;
        buildPhase = ''
          for dir in . apps/ponte libs/core; do
            if [ -d "${devDeps}/$dir/node_modules" ]; then
              cp -R "${devDeps}/$dir/node_modules" "$dir/"
              chmod -R u+w "$dir/node_modules"
            fi
          done
          patchShebangs node_modules apps/ponte/node_modules
          bash ./scripts/lint.sh
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
