{inputs, ...}: {
  flake.homeManagerModules.ponte = {
    config,
    lib,
    pkgs,
    ...
  }: let
    cfg = config.programs.ponte;
    tomlFormat = pkgs.formats.toml {};

    vendorSkillModule = lib.types.submodule {
      options.enable = lib.mkOption {
        type = lib.types.nullOr lib.types.bool;
        default = null;
        description = "Override enabled state for this skill on this vendor. null = inherit global vendor setting.";
      };
    };

    skillModule = lib.types.submodule {
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
          description = "Subdirectory within the git repo that contains the skill.";
        };
        vendors = lib.mkOption {
          type = lib.types.attrsOf vendorSkillModule;
          default = {};
          description = "Per-vendor overrides for this skill.";
        };
      };
    };

    subagentModule = lib.types.submodule {
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
          description = "Subdirectory within the git repo that contains the subagent.";
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

    mkSkillEntry = skill:
      {source = skill.source;}
      // lib.optionalAttrs (skill.ref != "") {ref = skill.ref;}
      // lib.optionalAttrs (skill.subdir != "") {subdir = skill.subdir;}
      // lib.optionalAttrs (skill.vendors != {}) {
        vendors =
          lib.mapAttrs (_: v: {enabled = v.enable;})
          (lib.filterAttrs (_: v: v.enable != null) skill.vendors);
      };

    mkSubagentEntry = sub:
      {source = sub.source;}
      // lib.optionalAttrs (sub.ref != "") {ref = sub.ref;}
      // lib.optionalAttrs (sub.subdir != "") {subdir = sub.subdir;};

    generated =
      {
        system_prompt_file = cfg.systemPromptFile;
        vendors = lib.mapAttrs (_: vendor: {enabled = vendor.enable;}) cfg.vendors;
      }
      // lib.optionalAttrs (cfg.skills != {}) {
        skills = lib.mapAttrs (_: mkSkillEntry) cfg.skills;
      }
      // lib.optionalAttrs (cfg.subagents != {}) {
        subagents = lib.mapAttrs (_: mkSubagentEntry) cfg.subagents;
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
        "gemini-cli" = mkVendor "Gemini CLI";
        "cursor-agent" = mkVendor "Cursor";
      };

      skills = lib.mkOption {
        type = lib.types.attrsOf skillModule;
        default = {};
        example = lib.literalExpression ''
          {
            "my-skill" = {
              source = "https://github.com/me/skills";
              ref = "abc123";
              subdir = "my-skill";
            };
            "local-skill" = {
              source = "/path/to/local-skill";
            };
            "claude-only" = {
              source = "/path/to/claude-only";
              vendors."gemini-cli".enable = false;
              vendors."codex".enable = false;
            };
          }
        '';
        description = "Skills to sync to enabled vendors. The attribute name is the skill name.";
      };

      subagents = lib.mkOption {
        type = lib.types.attrsOf subagentModule;
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
      xdg.configFile."ponte/config.toml".source =
        tomlFormat.generate "ponte-config.toml" settings;
    };
  };
}
