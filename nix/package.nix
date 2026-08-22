{...}: {
  perSystem = {pkgs, ...}: let
    bun = pkgs.bun;
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
        cd "$src"
        ${bun}/bin/bun build ./apps/ponte/src/index.ts --compile --outfile $out/ponte
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
