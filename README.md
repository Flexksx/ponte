# ponte

> **ponte** — Portuguese for *bridge*. Pronounced **pon-chee** (`/ˈpõ.tʃi/`).

Sync AI agent instructions, skills, and subagents across vendors —
Claude Code, Codex, Antigravity CLI, Cursor, OpenCode, Pi — from a
single config.

## What it is

Every AI coding agent keeps its own config in its own place: Claude Code
reads `~/.claude/`, Codex reads `~/.codex/`, Antigravity CLI, Cursor,
OpenCode and Pi each have their own dotfiles. The same system prompt,
the same skills, the same subagent definitions end up copy-pasted and
drifting across six trees.

ponte is the bridge between them. You declare your system prompt,
skills, and subagents **once** in `~/.config/ponte/`. `ponte sync`
resolves every source and symlinks it into each vendor's config
directory. One source of truth fans out to every tool.

Because the links point straight at your sources:

- An edit to a skill or a prompt reaches every vendor at once. There is
  nothing to rebuild.
- `ponte sync` removes the links for what you deleted from the config,
  so a dropped skill stops loading everywhere.
- A real file or directory you put in a vendor folder is left alone.
  ponte only removes links it could have created.
- Nothing is copied, so there is no store to grow and nothing to
  garbage collect.

## Install

```sh
# Nix
nix profile install github:flexksx/ponte

# From source (Bun)
bun build ./apps/ponte/src/index.ts --compile --outfile ./out/ponte
```

A [home-manager module](#nix--home-manager-reference) is also available.

## Showcase

```sh
# First run bootstraps ~/.config/ponte/config.toml and an empty AGENTS.md
ponte sync

# Point ponte at your system prompt, then activate it everywhere
ponte sysprompt set ~/prompts/my-prompt.md
ponte sync

# See where every vendor stands
ponte status

# List what's declared
ponte skills
ponte subagents

# Sync to a single vendor only
ponte sync -a claude-code

# Preview a change without touching any vendor
ponte sync --dry-run

# Read the full manual
ponte manual
```

To add a skill, declare it in `~/.config/ponte/config.toml` and run
`ponte sync` — it lands at `~/.claude/skills/<name>`,
`~/.codex/skills/<name>`, and every other enabled vendor at once.

```toml
[skills.my-skill]
source = "skills/my-skill"   # relative to ~/.config/ponte/
```

See [the CLI manual](apps/ponte/src/cli/manual.md) for the full CLI reference and usage guide.

## Project mode

A repository can carry its own skills. Put a `ponte.toml` file in the
repository root:

```toml
[skills.house-style]
source = "https://github.com/owner/skills-repo"
ref    = "abc123def456"
subdir = "house-style"       # optional

[skills.internal]
source = "skills/internal"   # relative to the project root
```

Every command walks up from the working directory to find `ponte.toml`. If a
command finds the file, that directory is the project root and the command
runs in project mode. No flag is involved. Project mode reads no global
config and needs no system prompt.

```sh
cd my-repo
ponte sync                          # vendor the git skills, then link them
ponte skills                        # kind and locked commit per skill
ponte status                        # link state of .agents/skills
ponte update house-style            # take a new version of one skill
git add ponte.toml .ponte .agents   # commit the copies and the links
```

What `ponte sync` does in a project:

- Fetches a git source through `~/.cache/ponte/sources/`, then copies it to
  `.ponte/sources/<name>` without the `.git` directory.
- Copies a skill only when `.ponte/sources/<name>` is absent, so a local edit
  survives every later sync. Commit the edit; run `ponte update` to overwrite
  it on purpose.
- Records the source commit per skill in `.ponte/lock.toml`.
- Links each skill into `.agents/skills/<name>`. A link to a path inside the
  project is relative, so it keeps working in every clone.
- Removes the stale links in `.agents/skills/`, and leaves a real file or a
  real directory there alone.

`ponte update [name]` re-vendors a skill at the `ref` in `ponte.toml`. It
compares the vendored copy with its locked commit first, and refuses a copy
with local edits unless you pass `--force`.

Only `[skills.<name>]` tables belong in `ponte.toml`. Any other top-level
key is an error.

## Configuration reference

ponte is configured two ways: directly via `config.toml`, or
declaratively via the home-manager module (which generates that same
`config.toml`). Both expose the same shape.

### TOML reference

All configuration lives in `~/.config/ponte/config.toml`. The first
`ponte sync` creates it with defaults.

```toml
# Path to the system prompt file. A bare filename resolves relative to
# ~/.config/ponte/; an absolute path is read as-is, letting an external
# repo own the prompt. Defaults to AGENTS.md when omitted.
system_prompt_file = "AGENTS.md"

# Per-vendor toggles. Omitting a vendor defaults to enabled = true.
[vendors.claude-code]
enabled = true

[vendors.codex]
enabled = true

[vendors.antigravity-cli]
enabled = true

[vendors.cursor-agent]
enabled = false

[vendors.opencode]
enabled = true

[vendors.pi-agent]
enabled = true

# Skills — one [skills.<name>] section per skill. Each is a directory
# containing a SKILL.md file plus supporting files. Every enabled vendor
# gets a link to it.

[skills.software-engineering]
source = "skills/software-engineering"   # relative to ~/.config/ponte/

[skills.ast-grep]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"   # full commit SHA preferred
subdir = ""   # optional: subdirectory inside the repo that contains the skill

# Subagents — one [subagents.<name>] section per subagent. Each source
# resolves to a directory of agent definition files. Each of those files
# gets a link in every enabled vendor agents directory.

[subagents.claude]
source = "subagents/claude"   # relative to the config directory
```

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `system_prompt_file` | string | `AGENTS.md` | System prompt path. Bare name → relative to `~/.config/ponte/`; absolute → read as-is. |
| `[vendors.<vendor>].enabled` | bool | `true` | Whether sync targets that vendor. Vendors: `claude-code`, `codex`, `antigravity-cli`, `cursor-agent`, `opencode`, `pi-agent`. |
| `[skills.<name>].source` | string | — | Local directory path, or a git URL (with `ref`/`subdir`). |
| `[skills.<name>].ref` | string | — | For git only: branch, tag, or commit. Prefer full commit SHAs. |
| `[skills.<name>].subdir` | string | — | Optional subdirectory inside the git repo that holds the skill. |
| `[subagents.<name>].source` | string | — | Directory of agent files, or a git URL; same schema as a skill source. |
| `[subagents.<name>].ref` | string | — | For git only: branch, tag, or commit. Prefer full commit SHAs. |
| `[subagents.<name>].subdir` | string | — | Optional subdirectory inside the git repo. |

`source` detection: a string starting with `https://`, `http://`, `git@`, or
`file://` is a git source; any other string is a local directory path. Local
paths resolve against `~/.config/ponte/`; absolute paths are used as-is.

### Nix / home-manager reference

The module installs the binary and generates `config.toml`
declaratively. The system prompt file (`AGENTS.md`) is intentionally
left **unmanaged** so `ponte sysprompt set` keeps working, and `ponte
sync` is **never run automatically** — run it yourself after a rebuild.

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

    # Read the system prompt from an absolute path (e.g. a config repo)
    # instead of ~/.config/ponte/AGENTS.md. A bare filename stays
    # relative to that dir.
    systemPromptFile = "/home/me/config/ai_agents/AGENTS.md";

    # Toggle individual vendors; unset vendors default to enabled.
    vendors."antigravity-cli".enable = false;

    skills."my-skill" = {
      source = "https://github.com/me/skills";
      ref = "abc123def456";
      subdir = "my-skill";
    };

    # Subagents: each source resolves to a directory of agent files. Each
    # file gets a link in every enabled vendor agents directory.
    subagents."claude".source = "/home/me/config/ai_agents/subagents/claude";
  };
}
```

| Option | Type | Default | Meaning |
|--------|------|---------|---------|
| `enable` | bool | `false` | Install ponte and generate `config.toml`. |
| `package` | package | flake's default | The ponte package to install. |
| `systemPromptFile` | string | `"AGENTS.md"` | Maps to `system_prompt_file`. Bare name → relative to `~/.config/ponte/`; absolute → read as-is. |
| `vendors.<vendor>.enable` | bool | `true` | Per-vendor toggle. Vendors: `claude-code`, `codex`, `antigravity-cli`, `cursor-agent`, `opencode`, `pi-agent`. |
| `skills.<name>` | `{ source; ref; subdir; }` | `{}` | Skill declarations, keyed by skill name. |
| `subagents.<name>` | `{ source; ref; subdir; }` | `{}` | Subagent declarations, keyed by subagent name. |
| `settings` | TOML attrset | `{}` | Escape hatch for keys the module doesn't model; merged into `config.toml` and **takes precedence** over generated values. |

The `source`, `ref` and `subdir` fields carry the same meanings as the
[TOML source table](#toml-reference). `ref` and `subdir` default to `""`
and are omitted from `config.toml` when empty.

## Documentation

See [the CLI manual](apps/ponte/src/cli/manual.md) for the full configuration reference and usage guide.
