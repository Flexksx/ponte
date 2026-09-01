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

# Skills — one [[skills]] entry per skill.
# Each skill is a directory containing a SKILL.md file plus any supporting files.
# An entry holds no name: ponte reads the name from the SKILL.md frontmatter.
# Every enabled vendor gets a link to the skill directory.

[[skills]]
source = "skills/software-engineering"   # relative to ~/.config/ponte/

[[skills]]
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
[[skills]]
source = "skills/my-skill"
```

`source` is a filesystem path. Relative paths resolve against
`~/.config/ponte/`. Absolute paths are used as-is. The path must be a
directory containing a `SKILL.md` file.

#### Git

```toml
[[skills]]
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

### Skill names

The [Agent Skills specification](https://agentskills.io) puts the name of a
skill in the YAML frontmatter of its `SKILL.md`, and the name must match the
parent directory name. ponte follows that rule: it reads the frontmatter
`name` of every skill on every sync and names the link after it.

```markdown
---
name: ast-grep
description: Structural code search with ast-grep.
---
```

A name holds 1 to 64 characters. Only lowercase letters `a-z`, digits `0-9`
and hyphens are legal. A name must not start with a hyphen, end with a
hyphen, or hold two hyphens in a row.

`ponte sync` stops and names the source when:

- the source directory holds no `SKILL.md`,
- the `SKILL.md` holds no frontmatter,
- the frontmatter declares no `name`,
- the name breaks one of the rules above, or
- two entries declare the same name.

#### Migration from named skill tables

Earlier versions of ponte named a skill with the table key, as in
`[skills.my-skill]`. That key is gone. If ponte finds a `[skills.<name>]`
table, it stops and asks for the new shape. To migrate, replace each table
header with `[[skills]]` and delete the name. The name in the `SKILL.md`
frontmatter now decides the link name, so make sure each `SKILL.md` declares
the name you expect.

### Skill directory layout

A skill directory must contain a `SKILL.md` file. The vendor links to
the directory, so every other file in it is available too.

```text
my-skill/
  SKILL.md            required, and its frontmatter holds the skill name
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
# Skills - one [[skills]] entry per skill. This is the only key that
# ponte.toml accepts. Any other top-level key is an error.

[[skills]]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"   # full commit SHA recommended
subdir = ""   # optional: subdirectory inside the repo that contains the skill

[[skills]]
source = "skills/house-style"   # relative to the project root
```

The `source`, `ref` and `subdir` fields carry the same meanings as in
`config.toml`. An entry holds no name: ponte reads the name from the
`SKILL.md` frontmatter, exactly as a global sync does. A relative local path
resolves against the project root. The keys `system_prompt_file`,
`[vendors]` and `[subagents]` are not part of the project schema.

### Project layout

```text
<project>/
  ponte.toml
  .ponte/
    lock.toml                source and commit per vendored skill
    sources/ast-grep/        full copy of the git source
  .agents/skills/
    ast-grep     → ../../.ponte/sources/ast-grep
    house-style  → ../../skills/house-style
```

### Vendoring

`ponte sync` fetches a git source through `~/.cache/ponte/sources/`, then
copies the resolved directory to `.ponte/sources/<name>`, where `<name>` is
the name in the frontmatter of the fetched `SKILL.md`. The copy holds no
`.git` directory, so the project owns the files.

`ponte sync` matches each git entry to a lock entry by `source` and `subdir`.
On a match, if `.ponte/sources/<name>` is present, `ponte sync` skips the
fetch and leaves the copy alone. So a vendored project needs no network on a
later sync, and an edit to a vendored skill is a normal change: commit it. To
take a new version of the skill, run `ponte update <name>`.

`ponte sync` also reads the frontmatter name of every vendored copy. If the
name no longer matches the directory name, `ponte sync` stops instead of
relinking the copy under the wrong name.

A local source is never copied. The link points straight at the directory.

### The lock file

`.ponte/lock.toml` records the source and the commit of each vendored skill,
keyed by the skill name.

```toml
[skills.ast-grep]
source = "https://github.com/example/ast-grep-skill"
subdir = "ast-grep"
commit = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
```

The `source` and `subdir` fields let `ponte sync` match a config entry to its
vendored copy without a fetch. `ponte sync` writes an entry when it vendors a
skill, and it drops an entry that the config no longer declares. `ponte
update` writes the new commit. `ponte update` also reads the file to find
local edits.

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

If the fresh checkout declares a different frontmatter name, the skill was
renamed upstream. `ponte update` stops and keeps the old copy. To take the
rename, delete `.ponte/sources/<old-name>` and run `ponte sync`. The next
sync vendors the skill under the new name, writes the new lock entry, and
removes the stale link in `.agents/skills/`.

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

`ponte skills` never uses the network. It reads the name of a local skill
from the `SKILL.md` on disk. For a git skill it reads the name only when the
git cache already holds the source. The `NAME` column holds `?` when the name
is not available yet; run `ponte sync` to fetch the source.

Prints `No skills configured.` when the config declares none.

In project mode, `ponte skills` lists the skills from `ponte.toml`. The
`KIND` column holds `vendored` for a git source and `local` for a path. The
`NAME` column of a git skill holds the name from `.ponte/lock.toml`, or `?`
when the lock file has no entry for the source. The `COMMIT` column holds the
short commit from `.ponte/lock.toml`, or `—` when the lock file has no entry
for the skill.

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
[[skills]]
source = "skills/my-skill"
```

Create `~/.config/ponte/skills/my-skill/SKILL.md` with `name: my-skill` in
its frontmatter, then:

```sh
ponte sync
```

The skill appears at `~/.claude/skills/my-skill`, `~/.codex/skills/my-skill`, etc.

### Declare a git-backed skill

```toml
[[skills]]
source = "https://github.com/owner/skills-repo"
ref    = "abc123def456"
subdir = "external-skill"
```

### Remove a skill everywhere

Delete the `[[skills]]` entry, then sync:

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
[[skills]]
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
