# ponte

Sync AI agent instructions, skills, and subagents across vendors —
Claude Code, Codex, Gemini CLI, Cursor — from a single config.

Instead of managing separate dotfiles per tool, declare your system
prompt, skills, and subagents once. `ponte sync` builds an immutable
artifact in a content-addressed store and activates it via symlinks, so
edits to your source never silently affect a running agent.

## Install

```sh
# Nix
nix profile install github:flexksx/ponte

# Go
go install github.com/flexksx/ponte/apps/ponte@latest
```

### Home-manager module

ponte ships a home-manager module that installs the binary and generates
`~/.config/ponte/config.toml` declaratively. The system prompt file
(`AGENTS.md`) is intentionally left unmanaged so `ponte sysprompt set` keeps
working, and `ponte sync` is never run automatically — run it yourself after a
rebuild.

```nix
# flake.nix
{
  inputs.ponte.url = "github:flexksx/ponte";
}
```

```nix
# home configuration
{ inputs, ... }: {
  imports = [ inputs.ponte.homeManagerModules.ponte ];

  programs.ponte = {
    enable = true;

    # Read the system prompt from an absolute path (e.g. a config repo) instead
    # of ~/.config/ponte/AGENTS.md. A bare filename stays relative to that dir.
    systemPromptFile = "/home/me/config/ai_agents/AGENTS.md";

    # Toggle individual vendors; unset vendors default to enabled.
    agents."gemini-cli".enable = false;

    skills = [
      {
        name = "my-skill";
        source = {
          type = "git";
          url = "https://github.com/me/skills";
          ref = "main";
          subdir = "my-skill";
        };
      }
    ];

    # Subagents: each source resolves to a directory of agent files that are
    # flattened into every enabled vendor's agents directory on sync.
    subagents = [
      {
        name = "claude";
        source = {
          type = "local";
          path = "/home/me/config/ai_agents/subagents/claude";
        };
      }
    ];
  };
}
```

Unmodeled config keys can be passed through `programs.ponte.settings`, which is
merged into `config.toml` and takes precedence over generated values.

## Quick start

```sh
# First run creates ~/.config/ponte/config.toml and AGENTS.md
ponte sync

# Set your system prompt
ponte sysprompt set ~/my-prompt.md

# Declare a skill in config.toml, then sync
ponte sync

# Read the full manual
ponte manual
```

## Documentation

See [MANUAL.md](MANUAL.md) for the full configuration reference and usage guide.
