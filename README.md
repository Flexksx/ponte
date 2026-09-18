# ponte

Sync your AI agent instructions, skills, and subagents across Claude Code,
Codex, Antigravity CLI, Cursor, OpenCode, and Pi from one configuration.

*ponte* is Portuguese for *bridge*. Say it pon-chee (`/ˈpõ.tʃi/`).

## What it is

Every AI coding agent keeps its configuration in its own place. Claude Code
reads `~/.claude/`, Codex reads `~/.codex/`, and the others each have their
own dotfiles. The same prompt and the same skills end up copied and drifting
across six trees.

ponte is the bridge. You declare the system prompt, the skills, and the
subagents once in `~/.config/ponte/`. `ponte sync` resolves every source and
links it into each vendor directory.

Because the links point straight at your sources:

- An edit to a skill or a prompt reaches every vendor at once. There is
  nothing to rebuild.
- `ponte sync` removes the links for what you deleted, so a dropped skill
  stops loading everywhere.
- ponte removes links only. A real file or a real directory in a vendor
  folder stays.
- Nothing is copied, so there is no store to grow and nothing to collect.

## Install

```sh
# Nix
nix profile install github:flexksx/ponte

# From source (Bun)
bun build ./apps/ponte/src/index.ts --compile --outfile ./out/ponte
```

A [home-manager module](#home-manager-module) is also available.

### Binary cache

CI pushes every Nix build to [Cachix](https://cachix.org), so a Nix user
downloads ponte instead of building it. The flake declares the cache. Nix
asks you to accept it on the first build.

If Nix prints a warning about an untrusted substituter, add the cache to
`/etc/nix/nix.conf` or `~/.config/nix/nix.conf`:

```conf
extra-substituters = https://ponte.cachix.org
extra-trusted-public-keys = ponte.cachix.org-1:REQfejqCR1XgRu8BkS1LYEq/jTyjUpY4UZX37svuStk=
```

## Quick start

```sh
ponte sync                                # creates config.toml and AGENTS.md
ponte sysprompt set ~/prompts/my-prompt.md
ponte sync                                # activate it everywhere
ponte status                              # see where every vendor stands
```

To add a skill, declare its source in `~/.config/ponte/config.toml` and
sync:

```toml
[[skills]]
source = "skills/my-skill"   # relative to ~/.config/ponte/
```

The declaration carries no name. ponte reads the `name` field from the
frontmatter of `SKILL.md`, the same name the agent uses. A skill that
declares `name: my-skill` lands at `~/.claude/skills/my-skill`,
`~/.codex/skills/my-skill`, and every other enabled vendor at once.

## Project mode

A repository can carry its own skills. Put a `ponte.toml` file in the
repository root:

```toml
[[skills]]
source = "https://github.com/owner/skills-repo"
ref    = "abc123def456"
subdir = "house-style"       # optional

[[skills]]
source = "skills/internal"   # relative to the project root
```

```sh
cd my-repo
ponte sync                          # copy the git skills, then link them
ponte update house-style            # take a new version of one skill
git add ponte.toml .ponte .agents   # commit the copies and the links
```

ponte finds the file by walking up from the working directory, so no flag
selects project mode. A git skill is copied into `.ponte/sources/` with its
commit recorded in `.ponte/lock.toml`. The copy is never overwritten by a
sync, so a local edit survives. Read
[Project mode](apps/ponte/src/cli/manual.md#project-mode) for the rest.

## Home-manager module

The module installs the binary and generates `config.toml`. It leaves the
system prompt file unmanaged, so `ponte sysprompt set` keeps working. It
never runs `ponte sync`, so run that yourself after a rebuild.

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

    # Read the system prompt from an absolute path, for example a config
    # repo. A bare filename stays relative to ~/.config/ponte/.
    systemPromptFile = "/home/me/config/ai_agents/AGENTS.md";

    # An unset vendor defaults to enabled.
    vendors."antigravity-cli".enable = false;

    skills = [
      {
        source = "https://github.com/me/skills";
        ref = "abc123def456";
        subdir = "my-skill";
      }
    ];

    subagents = [
      { source = "/home/me/config/ai_agents/subagents/claude"; }
    ];
  };
}
```

| Option | Type | Default | Meaning |
|--------|------|---------|---------|
| `enable` | bool | `false` | Install ponte and generate `config.toml`. |
| `package` | package | flake default | The ponte package to install. |
| `systemPromptFile` | string | `"AGENTS.md"` | Maps to `system_prompt_file`. |
| `vendors.<vendor>.enable` | bool | `true` | Per-vendor toggle. |
| `skills` | list of `{ source; ref; subdir; }` | `[]` | Skill sources. ponte reads each name from `SKILL.md`. |
| `subagents` | list of `{ source; ref; subdir; }` | `[]` | Subagent sources. Each file keeps its own name. |
| `settings` | TOML attrset | `{}` | Escape hatch for keys the module does not model. Merged into `config.toml`, and it wins over a generated value. |

`ref` and `subdir` default to `""` and are left out of `config.toml` when
empty. They carry the same meanings as in
[the manual](apps/ponte/src/cli/manual.md#sources).

## Documentation

[The manual](apps/ponte/src/cli/manual.md) holds the full configuration
reference and the CLI reference. `ponte manual` prints the same text.
