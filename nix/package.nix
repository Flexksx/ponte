{...}: {
  perSystem = {pkgs, ...}: let
    bun = pkgs.bun;

    bunDeps = pkgs.stdenv.mkDerivation {
      name = "ponte-bun-deps";
      version = "0.1.0";

      src = ../.;

      nativeBuildInputs = [bun pkgs.cacert];

      dontConfigure = true;

      buildPhase = ''
        runHook preBuild
        export HOME="$TMPDIR"
        export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
        bun install --production --frozen-lockfile --no-progress
        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p $out
        cp -RL apps/ponte/node_modules/. $out/
        runHook postInstall
      '';

      dontFixup = true;

      outputHashMode = "recursive";
      outputHashAlgo = "sha256";
      outputHash = "sha256-2+Yz0wJTxFoOhyfVSJFE0p8keVPL2yobWn0V468EJdA=";
    };
  in {
    packages.default = pkgs.stdenv.mkDerivation {
      name = "ponte";
      version = "0.1.0";

      src = ../.;

      strictDeps = true;
      nativeBuildInputs = [bun];

      dontConfigure = true;
      dontBuild = false;
      dontStrip = true;

      buildPhase = ''
        runHook preBuild
        export HOME="$TMPDIR"
        cp -R ${bunDeps} apps/ponte/node_modules
        chmod -R u+w apps/ponte/node_modules
        mkdir -p $out
        bun build ./apps/ponte/src/index.ts --compile --outfile $out/ponte
        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p $out/bin
        install -Dm755 $out/ponte $out/bin/ponte
        runHook postInstall
      '';
    };
  };
}
