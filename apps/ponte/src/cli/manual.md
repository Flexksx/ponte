# ponte manual

## Overview

ponte manages AI agent configuration — system prompts, skills, and
subagents — across multiple vendors from a single source of truth.

Supported vendors: `claude-code`, `codex`, `antigravity-cli`,
`cursor-agent`, `opencode`, `pi-agent`.

A repository can also carry its own skills in a `ponte.toml` file. Read
[Project mode](#project-mode) for that workflow.

### How it works

1. You declare the system prompt, the skills, and the subagents in
   `~/.config/ponte/config.toml`.
2. `ponte sync` resolves every source. A local source resolves to its
   directory. A git source resolves to a clone under
   `~/.cache/ponte/sources/`.
3. `ponte sync` then creates one symlink per item in each enabled
   vendor directory.
4. `ponte sync` removes symlinks that the configuration no longer
   declares. It never removes a real file or a real directory.

The symlinks point at the source, so an edit to a source file reaches
every vendor at once. Run `ponte sync` again only when you add an item,
remove an item, or want a git source to fetch a new ref.

```text
~/.config/ponte/          source (editable)
  config.toml
  AGENTS.md
  skills/my-skill/
  subagents/claude/code-investigator.md

~/.claude/CLAUDE.md                    → ~/.config/ponte/AGENTS.md
~/.claude/skills/my-skill              → ~/.config/ponte/skills/my-skill
~/.claude/agents/code-investigator.md  → ~/.config/ponte/subagents/claude/code-investigator.md
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
claude-code     = { enabled = true }
codex           = { enabled = true }
antigravity-cli = { enabled = true }
cursor-agent    = { enabled = false }
opencode        = { enabled = true }
pi-agent        = { enabled = true }

# Skills — one [skills.<name>] section per skill.
# Each skill is a directory containing a SKILL.md file plus any supporting files.
# Every enabled vendor gets a link to the skill directory.

[skills.software-engineering]
source = "skills/software-engineering"   # relative to ~/.config/ponte/

[skills.ast-grep]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"   # full commit SHA recommended
subdir = ""   # optional: subdirectory inside the repo that contains the skill

# Subagents — one [subagents.<name>] section per subagent.
# Each subagent source resolves to a directory of agent definition files.
# Each of those files gets a link in every enabled vendor agents directory.

[subagents.claude]
source = "subagents/claude"   # relative to ~/.config/ponte/
```

### Skill source types

#### Local

```toml
[skills.my-skill]
source = "skills/my-skill"
```

`source` is a filesystem path. Relative paths resolve against
`~/.config/ponte/`. Absolute paths are used as-is. The path must be a
directory containing a `SKILL.md` file.

#### Git

```toml
[skills.my-skill]
source = "https://github.com/owner/repo"
ref    = "v1.2.0"
subdir = "skills/my-skill"   # optional
```

`source` is treated as a git URL when it starts with `https://`,
`http://`, `git@`, or `file://`. ponte clones the repo into
`~/.cache/ponte/sources/` and checks out `ref` on every sync. `ref` can
be a branch name, tag, or commit SHA. Prefer a full commit SHA, because
a branch name moves.

The `subdir` field scopes the skill to a subdirectory of the repo. Omit
it to use the repo root.

The clone directory is keyed by URL and ref together. Two skills can
use the same repo at different refs.

### Skill directory layout

A skill directory must contain a `SKILL.md` file. The vendor links to
the directory, so every other file in it is available too.

```text
my-skill/
  SKILL.md            required
  references/         optional
    guide.md
```

### Subagents

Subagents are vendor agent definitions (e.g. Claude Code's
`~/.claude/agents/*.md`). Declare them with one `[subagents.<name>]`
section per subagent. The `source` field uses the same schema as
skills, but each source resolves to a **directory of agent files**
rather than a single skill directory.

```toml
[subagents.claude]
source = "subagents/claude"   # relative to ~/.config/ponte/
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

## Project mode

A repository can carry its own skills. Put a `ponte.toml` file in the
repository root and declare the skills there.

Every command walks up from the working directory to find `ponte.toml`. If a
command finds the file, that directory is the project root and the command
runs in project mode. If no directory on the way up holds the file, every
command behaves exactly as described above.

Project mode never reads and never creates `~/.config/ponte/`, and it needs
no system prompt. The only shared resource it uses is the git cache at
`~/.cache/ponte/sources/`.

### Project schema

```toml
# Skills - one [skills.<name>] section per skill. This is the only table
# that ponte.toml accepts. Any other top-level key is an error.

[skills.ast-grep]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"   # full commit SHA recommended
subdir = ""   # optional: subdirectory inside the repo that contains the skill

[skills.house-style]
source = "skills/house-style"   # relative to the project root
```

The `source`, `ref` and `subdir` fields carry the same meanings as in
`config.toml`. A relative local path resolves against the project root. The
keys `system_prompt_file`, `[vendors]` and `[subagents]` are not part of the
project schema.

### Project layout

```text
<project>/
  ponte.toml
  .ponte/
    lock.toml                commit per vendored skill
    sources/ast-grep/        full copy of the git source
  .agents/skills/
    ast-grep     → ../../.ponte/sources/ast-grep
    house-style  → ../../skills/house-style
```

### Vendoring

`ponte sync` fetches a git source through `~/.cache/ponte/sources/`, then
copies the resolved directory to `.ponte/sources/<name>`. The copy holds no
`.git` directory, so the project owns the files.

`ponte sync` copies a skill only when `.ponte/sources/<name>` is absent. A
later sync leaves the copy alone. An edit to a vendored skill is a normal
change: commit it. To take a new version of the skill, run
`ponte update <name>`.

A local source is never copied. The link points straight at the directory.

### The lock file

`.ponte/lock.toml` records the commit that each vendored skill came from.

```toml
[skills.ast-grep]
commit = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
```

`ponte sync` writes an entry when it vendors a skill. `ponte update` writes
the new commit. `ponte update` also reads the file to find local edits.

### What to commit

Commit `ponte.toml`, `.ponte/` and the links in `.agents/skills/`. A link to
a path inside the project is relative, so it keeps working in every clone. A
link to a local source outside the project stays absolute.

---

## CLI reference

### `ponte sync`

Resolve every source, then link the results into each enabled vendor
directory.

```text
ponte sync [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--global-instructions <file-or-string>` | `-g` | Use another system prompt for this run. If the argument is a path to a file, the vendors link to that file. If it is a string, ponte writes it to `~/.local/share/ponte/instruction` and the vendors link there. The configured `AGENTS.md` does not change. |
| `--agents <list>` | `-a` | Comma-separated list of vendors to target, in place of the configuration. Example: `claude-code,codex`. |
| `--dry-run` | | Resolve every source and report the vendors and the stale link count, without any write. |

If no configuration file exists, `ponte sync` first creates
`~/.config/ponte/config.toml` and an empty `AGENTS.md`.

`ponte sync` removes a symlink in a vendor `skills` or `agents`
directory when the configuration no longer declares it. A real file or
a real directory in those locations is never removed.

In project mode, `ponte sync` vendors the missing git skills, links every
skill into `.agents/skills/`, and removes the stale links there. It reports
the project root, the number of vendored skills, the number of links, and
the number of removed links. The `-g` and `-a` flags belong to a global
sync, so `ponte sync` rejects them inside a project.

**Exit codes:** 0 on success. Non-zero on any error, for example an
unknown agent, a source that does not resolve, or a filesystem error.

---

### `ponte update [name]`

Re-vendor a project skill from its source. This command works in project
mode only.

```text
ponte update [name] [--force]
```

| Argument | Description |
|----------|-------------|
| `name` | The skill to update. Omit it to update every vendored skill. |
| `--force` | Overwrite a vendored copy that differs from its locked commit. |

`ponte update` resolves the source at the `ref` in `ponte.toml`, replaces
`.ponte/sources/<name>` with the fresh checkout, and writes the new commit
to `.ponte/lock.toml`.

Before the first overwrite, `ponte update` checks out the locked commit in
the git cache and compares that tree with the vendored copy. If a tree
differs, or the lock file holds no entry for the skill, the command stops
and writes the skill names. Pass `--force` to overwrite anyway.

**Exit codes:** 0 on success. Non-zero outside a project, for an unknown
skill name, for a local skill, or for a copy with local edits.

---

### `ponte status`

Show, for each vendor, whether its links match the configuration.

```text
ponte status
```

The first line names the system prompt file. Each vendor row shows:

| Column | Meaning |
|--------|---------|
| `VENDOR` | The vendor name. |
| `ENABLED` | Whether the vendor is enabled in `config.toml`. |
| `LINKS` | The number of ponte symlinks in the vendor directories, or `—` when there are none. |
| `STATE` | `in sync` (every link is correct and no extra link remains), `drifted` (a link is missing, points elsewhere, or the configuration no longer declares it), `not synced` (no links), or `disabled` (a sync does not touch it). |

`ponte status` resolves git sources, exactly as a real sync does.

In project mode, `ponte status` prints the project root, the path of
`.agents/skills`, the number of links there, and one state for the whole
directory.

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

In project mode, `ponte skills` lists the skills from `ponte.toml`. The
`KIND` column holds `vendored` for a git source and `local` for a path. The
`COMMIT` column holds the short commit from `.ponte/lock.toml`, or `—` when
the lock file has no entry for the skill.

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

### Remove a skill everywhere

Delete the `[skills.<name>]` section, then sync:

```sh
ponte sync   # the link to that skill is removed from every vendor
```

### Sync to a specific vendor only

```sh
ponte sync -a claude-code
```

### Vendor a skill into a repository

Add `ponte.toml` to the repository root:

```toml
[skills.house-style]
source = "https://github.com/owner/skills-repo"
ref    = "abc123def456"
subdir = "house-style"
```

```sh
ponte sync                              # copy the skill, then link it
git add ponte.toml .ponte .agents       # commit the copy and the link
```

Later, to take a new version of the skill:

```sh
ponte update house-style
```

### Use another system prompt without changing the stored one

```sh
ponte sync -g "Temporary debugging instructions"
```

### Disable a vendor entirely

```toml
[vendors]
codex = { enabled = false }
```

```sh
ponte sync   # codex gets no links
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
3. Run `ponte sync`. ponte creates its own symlinks.

Do not run `ponte sync` before step 2 — home-manager's next activation
will overwrite ponte's links.

---

## Caching

**Git cache location:** `~/.cache/ponte/sources/<hash>/`

The `<hash>` is derived from the URL and the ref together, so the same
repo at two refs gets two clones. A repo already in the cache is
fetched, not cloned again.

Vendor symlinks for a git skill point into this cache. Do not delete a
cache directory while a vendor links to it. To start again, remove
`~/.cache/ponte/sources/` and run `ponte sync`.

A local skill needs no cache. Its symlink points straight at the source
directory, so an edit is visible to every vendor at once.
