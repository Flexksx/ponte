# ponte manual

## Overview

ponte manages AI agent configuration — system prompts, skills, and
subagents — across multiple vendors from a single source of truth.

Supported vendors: `claude-code`, `codex`, `gemini-cli`, `cursor-agent`.

### How it works

1. You declare your system prompt, skills, and subagents in
   `~/.config/ponte/`.
2. `ponte sync` resolves all skill and subagent sources, builds a
   content-addressed **store generation** under
   `~/.local/share/ponte/store/`, and creates symlinks from each
   vendor's config directory into the store.
3. Editing the source files has no effect on running agents until the
   next `ponte sync`. The store is read-only, so agents cannot
   accidentally modify their own configuration.

```text
~/.config/ponte/          source (editable)
  config.toml
  AGENTS.md
  skills/my-skill/

~/.local/share/ponte/store/<hash>/   immutable generation
  instruction
  skills/my-skill/
  subagents/claude/code-investigator.md

~/.claude/CLAUDE.md    → symlink into store
~/.claude/skills/my-skill  → symlink into store
~/.claude/agents/code-investigator.md  → symlink into store
```

---

## Configuration

All configuration lives in `~/.config/ponte/config.toml`. Running
`ponte sync` for the first time creates this file with defaults.

### Full schema

```toml
# Path to the system prompt file. A bare filename is resolved relative to
# ~/.config/ponte/; an absolute path is read as-is, letting an external repo
# own the prompt. Defaults to AGENTS.md when omitted.
system_prompt_file = "AGENTS.md"

# Per-vendor toggles. Omitting a vendor defaults to enabled = true.
[agents.claude-code]
enabled = true

[agents.codex]
enabled = true

[agents.gemini-cli]
enabled = true

[agents.cursor-agent]
enabled = false

# Skills — zero or more entries.
# Each skill is a directory containing a SKILL.md file plus any supporting files.
# Synced to every enabled vendor's skills directory.

[[skills]]
name = "software-engineering"
[skills.source]
type = "local"
path = "skills/software-engineering"   # relative to ~/.config/ponte/

[[skills]]
name = "ast-grep"
[skills.source]
type = "git"
url   = "https://github.com/example/ast-grep-skill"
ref   = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"   # full commit SHA recommended
subdir = ""   # optional: subdirectory inside the repo that contains the skill

# Subagents — zero or more entries.
# Each subagent source resolves to a directory of agent definition files.
# Those files are flattened into every enabled vendor's agents directory.
# Source uses the same schema as skills (local or git).

[[subagents]]
name = "claude"
[subagents.source]
type = "local"
path = "subagents/claude"   # relative to ~/.config/ponte/
```

### Skill source types

#### `local`

```toml
[skills.source]
type = "local"
path = "skills/my-skill"
```

`path` is relative to `~/.config/ponte/` when it does not start with
`/`. Absolute paths are used as-is. The path must be a directory.

#### `git`

```toml
[skills.source]
type = "git"
url  = "https://github.com/owner/repo"
ref  = "v1.2.0"
subdir = "skills/my-skill"   # optional
```

ponte clones the repo into `~/.cache/ponte/sources/` and checks out
`ref` on every sync. `ref` can be a branch name, tag, or commit SHA.
**Prefer full commit SHAs** — branch names move; a changed ref changes
the store hash and forces a rebuild.

The `subdir` field scopes the skill to a subdirectory of the repo. Omit
it to use the repo root.

Note: two skills from the same repo at different refs are not supported
in v1. Use distinct repos or distinct commits for independent skills.

### Skill directory layout

A skill directory must contain a `SKILL.md` file. Any additional files
(referenced from SKILL.md) are copied alongside it.

```text
my-skill/
  SKILL.md            required
  references/         optional
    guide.md
```

### Subagents

Subagents are vendor agent definitions (e.g. Claude Code's
`~/.claude/agents/*.md`). Declare them with `[[subagents]]` entries. The
`source` field uses the same `local`/`git` schema as skills, but each
source resolves to a **directory of agent files** rather than a single
skill directory.

```toml
[[subagents]]
name = "claude"
[subagents.source]
type = "local"
path = "subagents/claude"
```

On `ponte sync`, every regular file under the resolved directory is
symlinked, flattened by basename, into each enabled vendor's agents
directory. With the example above,
`subagents/claude/code-investigator.md` lands at
`~/.claude/agents/code-investigator.md`.

Subagents follow the same "sync to every enabled vendor" model as
skills. In practice only `claude-code` consumes an agents directory;
other vendors receive the files at `<vendor-root>/agents/` regardless.

---

## CLI reference

### `ponte sync`

Resolve all skill sources, build a store generation, and activate it for
all enabled vendors.

```text
ponte sync [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--global-instructions <file-or-string>` | `-g` | Override the system prompt for this invocation only. Reads from file if the argument is a path to an existing file; otherwise uses the string literally. The stored `AGENTS.md` is not modified. |
| `--agents <list>` | `-a` | Comma-separated list of vendors to target, bypassing config. Example: `claude-code,codex`. |

On first run with no config present, `ponte sync` bootstraps
`~/.config/ponte/config.toml` and an empty `AGENTS.md`, then proceeds.

**Exit codes:** 0 on success. Non-zero on any error (unknown agent,
skill resolution failure, filesystem error).

---

### `ponte sysprompt set <file-or-string>`

Persistently write the system prompt to `~/.config/ponte/AGENTS.md` (or
whichever file `system_prompt_file` points to). Does not sync to
vendors — run `ponte sync` afterwards.

```text
ponte sysprompt set ~/prompts/my-prompt.md
ponte sysprompt set "You are a helpful assistant."
```

If the argument is a path to an existing file, its contents are used.
Otherwise the argument itself is written verbatim.

---

### `ponte manual`

Print this manual to stdout.

```text
ponte manual | less
ponte manual > ~/ponte-manual.md
```

---

## Usage examples

### Minimal setup

```sh
ponte sync                            # bootstrap config
ponte sysprompt set my-prompt.md     # set system prompt
ponte sync                            # activate
```

### Declare a local skill

Add to `~/.config/ponte/config.toml`:

```toml
[[skills]]
name = "my-skill"
[skills.source]
type = "local"
path = "skills/my-skill"
```

Create `~/.config/ponte/skills/my-skill/SKILL.md`, then:

```sh
ponte sync
```

The skill appears at `~/.claude/skills/my-skill`, `~/.codex/skills/my-skill`, etc.

### Sync to a specific vendor only

```sh
ponte sync -a claude-code
```

### Override system prompt without changing the stored one

```sh
ponte sync -g "Temporary debugging instructions"
```

### Disable a vendor

```toml
[agents.codex]
enabled = false
```

```sh
ponte sync   # codex symlinks are not updated
```

---

## Migration from home-manager

If you currently manage `~/.claude/`, `~/.codex/`, etc. via
home-manager, the existing symlinks point into `/nix/store/` and will
conflict with ponte's symlinks.

Migration steps:

1. Remove the relevant `home.file` or `programs.*` entries from your
   home-manager flake.
2. Run `home-manager switch` — this removes the nix-store symlinks.
3. Run `ponte sync` — ponte creates its own symlinks into the ponte
   store.

Do not run `ponte sync` before step 2 — home-manager's next activation
will overwrite ponte's links.

---

## Store and caching

**Store location:** `~/.local/share/ponte/store/<hash>/`

Each sync with identical inputs reuses the same store generation (same
hash, no copy). Changing any input — prompt content, a skill file, or a
git ref — produces a new generation.

**Git cache location:** `~/.cache/ponte/sources/<url-hash>/`

Cloned repos are fetched (not re-cloned) on subsequent syncs.

**Garbage collection:** v1 has no automatic GC. Store generations
accumulate until manually removed. Run `rm -rf
~/.local/share/ponte/store/` to clear all generations; the next
`ponte sync` rebuilds from source.
