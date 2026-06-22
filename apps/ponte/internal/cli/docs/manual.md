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

# Per-vendor toggles. Each key must be a known vendor name.
[vendors]
claude-code   = { enabled = true }
codex         = { enabled = true }
gemini-cli    = { enabled = true }
cursor-agent  = { enabled = false }

# Skills — one [skills.<name>] section per skill.
# Each skill is a directory containing a SKILL.md file plus any supporting files.
# Synced to every enabled vendor unless a per-vendor override disables it.

[skills.software-engineering]
source = "skills/software-engineering"   # relative to ~/.config/ponte/

[skills.ast-grep]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"   # full commit SHA recommended
subdir = ""   # optional: subdirectory inside the repo that contains the skill

# Per-vendor override — disable a skill for a specific vendor only.
[skills.ast-grep.vendors.gemini-cli]
enabled = false

# Subagents — one [subagents.<name>] section per subagent.
# Each subagent source resolves to a directory of agent definition files.
# Those files are flattened into every enabled vendor's agents directory.

[subagents.claude]
source = "subagents/claude"   # relative to ~/.config/ponte/
```

### Skill source types

#### Local

```toml
[skills.my-skill]
source = "skills/my-skill"
```

`source` is a filesystem path. Relative paths resolve against `~/.config/ponte/`. Absolute paths are used as-is. The path must be a directory containing a `SKILL.md` file.

#### Git

```toml
[skills.my-skill]
source = "https://github.com/owner/repo"
ref    = "v1.2.0"
subdir = "skills/my-skill"   # optional
```

`source` is treated as a git URL when it starts with `https://`, `http://`, `git@`, or `file://`. ponte clones the repo into `~/.cache/ponte/sources/` and checks out `ref` on every sync. `ref` can be a branch name, tag, or commit SHA. **Prefer full commit SHAs** — branch names move; a changed ref changes the store hash and forces a rebuild.

The `subdir` field scopes the skill to a subdirectory of the repo. Omit
it to use the repo root.

Note: two skills from the same repo at different refs are not supported
in v1. Use distinct repos or distinct commits for independent skills.

### Per-vendor skill overrides

A skill is synced to all enabled vendors by default. To restrict a skill to specific vendors, add `[skills.<name>.vendors.<vendor>]` sections:

```toml
[skills.java-dev]
source = "skills/java-dev"

[skills.java-dev.vendors.codex]
enabled = false

[skills.java-dev.vendors.cursor-agent]
enabled = false
```

This syncs `java-dev` to `claude-code` and `gemini-cli` only.

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
| `--dry-run` | | Resolve all sources and report the generation hash that would be built and the vendors that would be updated, without writing to the store or touching any vendor symlink. |

On first run with no config present, `ponte sync` bootstraps
`~/.config/ponte/config.toml` and an empty `AGENTS.md`, then proceeds.

On success, `sync` prints the activated generation hash and the targeted
vendors. With `--dry-run` it prints the generation that *would* be built and
where it *would* sync, then exits without side effects — useful to preview the
effect of source edits before committing them.

**Exit codes:** 0 on success. Non-zero on any error (unknown agent,
skill resolution failure, filesystem error).

---

### `ponte status`

Show, per vendor, the generation its instruction symlink currently resolves to
and whether it has drifted from what a sync would build now.

```text
ponte status
```

The first line reports the **would-be generation** — the hash a `ponte sync`
would produce from the current sources. Each vendor row then shows:

| Column | Meaning |
|--------|---------|
| `VENDOR` | The vendor name. |
| `ENABLED` | Whether the vendor is enabled in `config.toml`. |
| `ACTIVE` | The generation hash the vendor currently points at, or `—` if never synced. |
| `STATE` | `in sync` (active matches would-be), `drifted` (active differs), `not synced` (no active generation), or `disabled` (a sync will not touch it). |

Resolving the would-be generation fetches any git-backed sources, exactly as a
real sync would.

---

### `ponte gc`

Remove store generations that no vendor currently points to. All vendors are
considered — including disabled ones — so a generation pinned by any vendor
symlink is always kept.

```text
ponte gc [--dry-run]
```

| Flag | Description |
|------|-------------|
| `--dry-run` | List the generations that would be removed without deleting them. |

The store has no automatic garbage collection; superseded generations
accumulate after every source change. `gc` reclaims them. The active
generation for each vendor is never removed.

---

### `ponte subagents`

List the subagents declared in `config.toml`, with each subagent's name, source
type, and resolved source. Mirrors `ponte skills`.

```text
ponte subagents
```

Prints `No subagents configured.` when the config declares none.

---

### `ponte skills`

List the skills declared in `config.toml`, with each skill's name,
source type, and resolved source (local path, or git URL with ref and
optional subdir).

```text
ponte skills
```

Prints `No skills configured.` when the config declares none.

---

### `ponte sysprompt`

Print the current system prompt — the contents of the file
`system_prompt_file` points to — to stdout, so it can be piped or
redirected.

```text
ponte sysprompt
ponte sysprompt > current-prompt.md
```

Prints a notice to stderr when no system prompt is set.

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
[skills.my-skill]
source = "skills/my-skill"
```

Create `~/.config/ponte/skills/my-skill/SKILL.md`, then:

```sh
ponte sync
```

The skill appears at `~/.claude/skills/my-skill`, `~/.codex/skills/my-skill`, etc.

### Declare a git-backed skill

```toml
[skills.external-skill]
source = "https://github.com/owner/skills-repo"
ref    = "abc123def456"
subdir = "external-skill"
```

### Disable a skill for a specific vendor

```toml
[skills.java-dev]
source = "skills/java-dev"

[skills.java-dev.vendors.codex]
enabled = false
```

### Sync to a specific vendor only

```sh
ponte sync -a claude-code
```

### Override system prompt without changing the stored one

```sh
ponte sync -g "Temporary debugging instructions"
```

### Disable a vendor entirely

```toml
[vendors]
codex = { enabled = false }
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

**Garbage collection:** there is no *automatic* GC — generations accumulate
after every source change. Run `ponte gc` to remove every generation no vendor
points to (use `ponte gc --dry-run` to preview). The active generation for each
vendor is always kept. To clear everything unconditionally, `rm -rf
~/.local/share/ponte/store/`; the next `ponte sync` rebuilds from source.
