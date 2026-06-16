{inputs, ...}: {
  flake.homeManagerModules.ponte = {
    config,
    lib,
    pkgs,
    ...
  }: let
    cfg = config.programs.ponte;
    tomlFormat = pkgs.formats.toml {};

    sourceModule = lib.types.submodule {
      options = {
        type = lib.mkOption {
          type = lib.types.enum ["local" "git"];
          description = "Skill source kind.";
        };
        path = lib.mkOption {
          type = lib.types.str;
          default = "";
          description = "Filesystem path for a local source. Relative paths resolve against ~/.config/ponte.";
        };
        url = lib.mkOption {
          type = lib.types.str;
          default = "";
          description = "Git remote URL for a git source.";
        };
        ref = lib.mkOption {
          type = lib.types.str;
          default = "";
          description = "Git ref (branch, tag, commit) for a git source.";
        };
        subdir = lib.mkOption {
          type = lib.types.str;
          default = "";
          description = "Subdirectory within the source that holds the skill.";
        };
      };
    };

    skillModule = lib.types.submodule {
      options = {
        name = lib.mkOption {
          type = lib.types.str;
          description = "Skill name.";
        };
        source = lib.mkOption {
          type = sourceModule;
          description = "Where the skill is fetched from.";
        };
      };
    };

    mkAgent = name:
      lib.mkOption {
        type = lib.types.submodule {
          options.enable = lib.mkOption {
            type = lib.types.bool;
            default = true;
            description = "Whether ponte syncs to ${name}.";
          };
        };
        default = {};
        description = "Configuration for the ${name} agent vendor.";
      };

    mkSource = src:
      {type = src.type;}
      // lib.optionalAttrs (src.path != "") {path = src.path;}
      // lib.optionalAttrs (src.url != "") {url = src.url;}
      // lib.optionalAttrs (src.ref != "") {ref = src.ref;}
      // lib.optionalAttrs (src.subdir != "") {subdir = src.subdir;};

    generated =
      {
        system_prompt_file = cfg.systemPromptFile;
        agents = lib.mapAttrs (_: agent: {enabled = agent.enable;}) cfg.agents;
      }
      # cfg.agents is a fixed set of known vendors; each survives toggling
      # independently, unlike an attrsOf whose defaults vanish on first define.
      // lib.optionalAttrs (cfg.skills != []) {
        skills =
          map (skill: {
            inherit (skill) name;
            source = mkSource skill.source;
          })
          cfg.skills;
      };

    settings = lib.recursiveUpdate generated cfg.settings;
  in {
    options.programs.ponte = {
      enable = lib.mkEnableOption "ponte, the AI agent instruction and skill sync CLI";

      package = lib.mkOption {
        type = lib.types.package;
        default = inputs.self.packages.${pkgs.stdenv.hostPlatform.system}.default;
        defaultText = lib.literalExpression "ponte.packages.\${system}.default";
        description = "The ponte package to install.";
      };

      systemPromptFile = lib.mkOption {
        type = lib.types.str;
        default = "AGENTS.md";
        description = ''
          Filename, within ~/.config/ponte, that ponte reads the global system
          prompt from. The file itself is left unmanaged so `ponte sysprompt set`
          keeps working; only its name is declared here.
        '';
      };

      agents = {
        "claude-code" = mkAgent "Claude Code";
        "codex" = mkAgent "Codex";
        "gemini-cli" = mkAgent "Gemini CLI";
        "cursor-agent" = mkAgent "Cursor";
      };

      skills = lib.mkOption {
        type = lib.types.listOf skillModule;
        default = [];
        example = lib.literalExpression ''
          [
            {
              name = "my-skill";
              source = {
                type = "git";
                url = "https://github.com/me/skills";
                ref = "main";
                subdir = "my-skill";
              };
            }
          ]
        '';
        description = "Skills to declare in config.toml.";
      };

      settings = lib.mkOption {
        type = tomlFormat.type;
        default = {};
        description = ''
          Extra raw config merged into config.toml. Escape hatch for keys this
          module does not model; takes precedence over generated values.
        '';
      };
    };

    config = lib.mkIf cfg.enable {
      home.packages = [cfg.package];
      xdg.configFile."ponte/config.toml".source =
        tomlFormat.generate "ponte-config.toml" settings;
    };
  };
}
