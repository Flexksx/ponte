{...}: {
  perSystem = {
    pkgs,
    lib,
    ...
  }: {
    apps = {
      check-ts = {
        type = "app";
        program = lib.getExe (pkgs.writeShellApplication {
          name = "check-ts";
          runtimeInputs = [pkgs.biome];
          text = ''biome check "$@"'';
        });
      };

      check-nix = {
        type = "app";
        program = lib.getExe (pkgs.writeShellApplication {
          name = "check-nix";
          runtimeInputs = [pkgs.alejandra];
          text = ''alejandra --check "$@"'';
        });
      };

      check-md = {
        type = "app";
        program = lib.getExe (pkgs.writeShellApplication {
          name = "check-md";
          runtimeInputs = [pkgs.rumdl];
          text = ''rumdl check "$@"'';
        });
      };

      lint = {
        type = "app";
        program = lib.getExe (pkgs.writeShellApplication {
          name = "lint";
          runtimeInputs = [pkgs.biome pkgs.bun];
          text = ''
            bun install --frozen-lockfile --no-progress
            exec ./scripts/lint.sh
          '';
        });
      };
    };
  };
}
