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
