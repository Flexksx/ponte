{...}: {
  perSystem = {
    pkgs,
    lib,
    config,
    ...
  }: {
    options.shellPackages = lib.mkOption {
      type = lib.types.listOf lib.types.package;
      default = [];
    };

    options.shellHooks = lib.mkOption {
      type = lib.types.lines;
      default = "";
    };

    config = {
      shellPackages = with pkgs; [just alejandra lefthook rumdl];

      devShells.default = pkgs.mkShell {
        name = "ponte-dev-env";
        packages = config.shellPackages;
        shellHook = config.shellHooks;
      };
    };
  };
}
