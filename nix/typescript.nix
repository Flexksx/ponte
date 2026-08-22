# Bun/TS stack, added to the dev shell by devtools.nix.
# Bun is the runtime and build toolchain; biome formats and lints the JS/TS.
{...}: {
  perSystem = {
    pkgs,
    config,
    ...
  }: {
    config.shellPackages = with pkgs; [
      bun
      biome
    ];
  };
}
