{inputs, ...}: {
  flake.homeManagerModules.ponte = {
    config,
    lib,
    pkgs,
    ...
  }: let
    cfg = config.programs.ponte;
    tomlFormat = {
      type = lib.types.toml;
      generate = name: value:
        pkgs.runCommand name
        {
          nativeBuildInputs = [pkgs.yj];
          value = builtins.toJSON value;
          preferLocalBuild = true;
          __structuredAttrs = true;
        }
        ''
          printf '%s' "$value" | yj -jt > "$out"
        '';
    };

    sourceModule = lib.types.submodule {
      options = {
        source = lib.mkOption {
          type = lib.types.str;
          description = "Local path or git URL. Git URLs start with https://, http://, git@, or file://.";
        };
        ref = lib.mkOption {
          type = lib.types.str;
          default = "";
          description = "Git ref (branch, tag, commit SHA) for a git source.";
        };
        subdir = lib.mkOption {
          type = lib.types.str;
          default = "";
          description = "Subdirectory within the git repo that contains the source.";
        };
      };
    };

    mkVendor = name:
      lib.mkOption {
        type = lib.types.submodule {
          options.enable = lib.mkOption {
            type = lib.types.bool;
            default = true;
            description = "Whether ponte syncs to ${name}.";
          };
        };
        default = {};
        description = "Configuration for the ${name} vendor.";
      };

    mkSourceEntry = entry:
      {
        source = entry.source;
      }
      // lib.optionalAttrs (entry.ref != "") {ref = entry.ref;}
      // lib.optionalAttrs (entry.subdir != "") {subdir = entry.subdir;};

    generated =
      {
        system_prompt_file = cfg.systemPromptFile;
        vendors = lib.mapAttrs (_: vendor: {enabled = vendor.enable;}) cfg.vendors;
      }
      // lib.optionalAttrs (cfg.skills != []) {
        skills = map mkSourceEntry cfg.skills;
      }
      // lib.optionalAttrs (cfg.subagents != {}) {
        subagents = lib.mapAttrs (_: mkSourceEntry) cfg.subagents;
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
        example = "/home/me/config/ai_agents/AGENTS.md";
        description = ''
          Where ponte reads the global system prompt from. A bare filename
          resolves within ~/.config/ponte; an absolute path is read as-is, so a
          config repo can own the prompt directly. Relative-path files are left
          unmanaged so `ponte sysprompt set` keeps working; only the name is
          declared here.
        '';
      };

      vendors = {
        "claude-code" = mkVendor "Claude Code";
        "codex" = mkVendor "Codex";
        "antigravity-cli" = mkVendor "Antigravity CLI";
        "cursor-agent" = mkVendor "Cursor";
        "opencode" = mkVendor "OpenCode";
        "pi-agent" = mkVendor "Pi Agent";
      };

      skills = lib.mkOption {
        type = lib.types.listOf sourceModule;
        default = [];
        example = lib.literalExpression ''
          [
            {
              source = "https://github.com/me/skills";
              ref = "abc123";
              subdir = "my-skill";
            }
            {
              source = "/path/to/local-skill";
            }
          ]
        '';
        description = ''
          Skills to sync to enabled vendors. A skill carries no name here: ponte
          reads the name from the `name` field in the frontmatter of the skill's
          SKILL.md file, as the Agent Skills specification requires.
        '';
      };

      subagents = lib.mkOption {
        type = lib.types.attrsOf sourceModule;
        default = {};
        example = lib.literalExpression ''
          {
            "claude" = {
              source = "/home/me/config/ai_agents/subagents/claude";
            };
          }
        '';
        description = "Subagents to sync to enabled vendors. The attribute name is the subagent name.";
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
      xdg.configFile."ponte/config.toml".source = tomlFormat.generate "ponte-config.toml" settings;
    };
  };
}
