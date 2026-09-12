{...}: {
  perSystem = {
    pkgs,
    system,
    config,
    ...
  }: let
    version = "2.5.4";
    assets = {
      x86_64-linux = {
        url = "https://github.com/moonrepo/moon/releases/download/v${version}/moon_cli-x86_64-unknown-linux-gnu.tar.xz";
        hash = "sha256-4EDZabqz3/4kxFmA2eb94yeAjuCJgOS+Zkyf82CTokM=";
      };
      aarch64-linux = {
        url = "https://github.com/moonrepo/moon/releases/download/v${version}/moon_cli-aarch64-unknown-linux-gnu.tar.xz";
        hash = "";
      };
      x86_64-darwin = {
        url = "https://github.com/moonrepo/moon/releases/download/v${version}/moon_cli-x86_64-apple-darwin.tar.xz";
        hash = "";
      };
      aarch64-darwin = {
        url = "https://github.com/moonrepo/moon/releases/download/v${version}/moon_cli-aarch64-apple-darwin.tar.xz";
        hash = "";
      };
    };
    asset = assets.${system} or (throw "moon: unsupported system ${system}");
  in {
    packages.moon = pkgs.stdenv.mkDerivation {
      pname = "moon";
      inherit version;
      src = pkgs.fetchzip {
        inherit (asset) url hash;
      };
      dontConfigure = true;
      dontBuild = true;
      installPhase = ''
        install -Dm755 moon $out/bin/moon
        install -Dm755 moonx $out/bin/moonx
      '';
    };
  };
}
