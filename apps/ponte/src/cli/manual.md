# ponte manual

ponte keeps one copy of your agent instructions and links it into every AI
coding tool you use. Vendors: `claude-code`, `codex`, `antigravity-cli`,
`cursor-agent`, `opencode`, `pi-agent`.

ponte runs in one of two modes:

- Global mode reads `~/.config/ponte/config.toml` and links into your home
  directory. It carries a system prompt, skills, and subagents.
- Project mode reads `ponte.toml` in a repository and links inside that
  repository. It carries skills only.

Every command walks up from the working directory to look for `ponte.toml`.
If a command finds the file, that directory is the project root and the
command runs in project mode. If no directory holds the file, the command
runs in global mode. No flag selects the mode.

## How sync works

1. `ponte sync` resolves every source. A local source resolves to its
   directory. A git source resolves to a clone under
   `~/.cache/ponte/sources/`.
2. It creates one link in each enabled vendor directory. A link here is a
   symbolic link.
3. It removes the links that the configuration no longer declares. It never
   removes a real file or a real directory.

A link points at the source, so an edit reaches every vendor at once. Run
`ponte sync` again when you add an item, remove an item, or want a git
source at a new ref.

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

## Sources

Every skill and every subagent takes a `source`. A string that starts with
`https://`, `http://`, `git@`, or `file://` is a git URL. Any other string
is a filesystem path. A relative path resolves against the configuration
directory. An absolute path is used as-is.

A git source takes two more fields:

| Field | Meaning |
|-------|---------|
| `ref` | Branch, tag, or commit. Prefer a full commit SHA, because a branch moves. |
| `subdir` | Subdirectory inside the repository. Omit it to use the repository root. |

ponte clones the repository into `~/.cache/ponte/sources/` and checks out
`ref` on every sync. The cache directory is keyed by URL and ref together,
so two skills can use the same repository at different refs.

### Skills

A skill source resolves to one skill directory, in the format at
[agentskills.io](https://agentskills.io). The vendor links to the whole
directory.

The configuration declares no skill name. After a source resolves, ponte
reads the `name` field from the frontmatter of `SKILL.md`, and it uses that
name for the link, for the vendored directory and for the lock entry. A name
holds 1 to 64 characters from `a-z`, `0-9` and single hyphens. It starts and
ends with a letter or a digit.

ponte stops with an error in these cases:

- The skill directory holds no `SKILL.md`.
- `SKILL.md` has no frontmatter block.
- The frontmatter declares no `name`.
- The name breaks the rules above.
- Two skill entries declare the same name.

### Subagents

A subagent source resolves to a directory of agent definition files, not to
one skill directory. `ponte sync` links every regular file under it,
flattened by basename, into each enabled vendor agents directory. With
`source = "subagents/claude"`, the file
`subagents/claude/code-investigator.md` lands at
`~/.claude/agents/code-investigator.md`.

The file name is the link name, so the configuration declares no subagent
name either.

In practice only `claude-code` reads an agents directory. The other vendors
get the files at `<vendor-root>/agents/` anyway.

---

## Global configuration

All global configuration lives in `~/.config/ponte/config.toml`. The first
`ponte sync` creates the file with defaults.

```toml
# Path to the system prompt file. A bare filename resolves against
# ~/.config/ponte/. An absolute path is read as-is, so an external repo can
# own the prompt. Defaults to AGENTS.md.
system_prompt_file = "AGENTS.md"

# Per-vendor toggles. Each key must be a known vendor name.
[vendors]
claude-code     = { enabled = true }
codex           = { enabled = true }
antigravity-cli = { enabled = true }
cursor-agent    = { enabled = false }
opencode        = { enabled = true }
pi-agent        = { enabled = true }

# One [[skills]] section per skill. ponte reads the name from SKILL.md.
[[skills]]
source = "skills/software-engineering"

[[skills]]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
subdir = ""

# One [[subagents]] section per subagent source.
[[subagents]]
source = "subagents/claude"
```

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `system_prompt_file` | string | `AGENTS.md` | Path to the system prompt file. |
| `[vendors.<vendor>].enabled` | bool | `true` | Whether a sync targets that vendor. |
| `[[skills]].source` | string | — | Path or git URL. |
| `[[skills]].ref` | string | — | Git only. |
| `[[skills]].subdir` | string | — | Git only. |
| `[[subagents]]` | table | — | Same three fields as a skill. |

---

## Project mode

Put a `ponte.toml` file in the repository root and declare the skills in it.

Project mode never reads and never creates `~/.config/ponte/`, and it needs
no system prompt. The only shared resource it uses is the git cache.

```toml
# Per-vendor toggles. Omit the section to link into every vendor. When the
# section is present, only a vendor with enabled = true gets links.
[vendors.claude-code]
enabled = true

[vendors.codex]
enabled = false

[[skills]]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
subdir = ""

[[skills]]
source = "skills/house-style"   # relative to the project root
```

A relative local path resolves against the project root. The keys
`system_prompt_file` and `[subagents]` are not part of the project schema.
Any other top-level key is an error.

### Layout

```text
<project>/
  ponte.toml
  .ponte/
    lock.toml                commit per vendored skill
    sources/ast-grep/        full copy of the git source
  .agents/skills/
    ast-grep     → ../../.ponte/sources/ast-grep
    house-style  → ../../skills/house-style
  .claude/skills/
    ast-grep     → ../../.ponte/sources/ast-grep
    house-style  → ../../skills/house-style
  .codex/skills/
    ast-grep     → ../../.ponte/sources/ast-grep
    house-style  → ../../skills/house-style
```

`ponte sync` links every skill into `.agents/skills/` and into each enabled
vendor project-level skill directory. Claude Code reads `.claude/skills/`,
Codex reads `.codex/skills/`, and so on.

### Vendoring

`ponte sync` fetches a git source through the cache, then copies the
resolved directory to `.ponte/sources/<name>`. The copy holds no `.git`
directory, so the project owns the files.

`ponte sync` copies a skill only when `.ponte/sources/<name>` is absent, so
a local edit survives every later sync. Commit the edit. To take a new
version of the skill, run `ponte update <name>`.

If the source declares a new name, `ponte update` stops and keeps the old
copy. Run `ponte sync` to vendor the skill under the new name, then delete
the old directory by hand.

A local source is never copied. The link points straight at the directory.

### The lock file

`.ponte/lock.toml` records the source and the commit of each vendored skill.
The table name is the name from `SKILL.md`.

```toml
[skills.ast-grep]
source = "https://github.com/example/ast-grep-skill"
commit = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
```

`ponte sync` writes an entry when it vendors a skill. A later sync matches a
configuration entry to its lock entry by source, so a clone with a committed
`.ponte/sources/` needs no network.

`ponte sync` also checks the `SKILL.md` name of each vendored copy against
its directory name. If the two differ, `ponte sync` stops.

### What to commit

Commit `ponte.toml`, `.ponte/`, and the skill links (`.agents/skills/`,
`.claude/skills/`, `.codex/skills/`, and so on). A link to a path inside the
project is relative, so it keeps working in every clone. A link to a local
source outside the project stays absolute.

---

## CLI reference

Every command exits 0 on success and non-zero on any error.

### `ponte sync`

Resolve every source, then link the results into each enabled vendor
directory. The first global run creates `~/.config/ponte/config.toml` and an
empty `AGENTS.md`.

```text
ponte sync [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--global-instructions <file-or-string>` | `-g` | Use another system prompt for this run. For a path to a file, the vendors link to that file. For a string, ponte writes it to `~/.local/share/ponte/instruction` and the vendors link there. The configured `AGENTS.md` does not change. |
| `--agents <list>` | `-a` | Comma-separated vendors to target, in place of the configuration. Example: `claude-code,codex`. |
| `--dry-run` | | Resolve every source and report the vendors and the stale link count, without any write. |

In project mode, `ponte sync` also vendors the missing git skills. It
reports the project root, the number of vendored skills, the number of
links, and the number of removed links. The `-g` and `-a` flags belong to a
global sync, so `ponte sync` rejects them inside a project.

```sh
ponte sync
ponte sync -a claude-code
ponte sync --dry-run
ponte sync -g "Temporary debugging instructions"
```

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
to the lock file.

Before the first overwrite, `ponte update` checks out the locked commit in
the cache and compares that tree with the vendored copy. If a tree differs,
or the lock file holds no entry for the skill, the command stops and writes
the skill names. Pass `--force` to overwrite anyway.

---

### `ponte status`

Show, for each vendor, whether its links match the configuration. The first
line names the system prompt file.

```text
ponte status
```

| Column | Meaning |
|--------|---------|
| `VENDOR` | The vendor name. |
| `ENABLED` | Whether the vendor is enabled. |
| `LINKS` | The number of ponte links in the vendor directories, or `—` when there are none. |
| `STATE` | `in sync`, `drifted`, `not synced`, or `disabled`. |

A vendor is `drifted` when a link is missing, points elsewhere, or the
configuration no longer declares it. `ponte status` resolves git sources,
exactly as a real sync does.

In project mode, `ponte status` prints the project root, the path of
`.agents/skills`, the total link count across all vendor directories, and
one state for the whole set.

---

### `ponte skills`

List the declared skills with each name, source type, and resolved source.
Prints `No skills configured.` when the configuration declares none.

In global mode, the `NAME` column holds the name from `SKILL.md` for a local
source. For a git source it holds `—`, because ponte does not clone a
repository to list it.

```text
ponte skills
```

In project mode, the `KIND` column holds `vendored` for a git source and
`local` for a path. The `COMMIT` column holds the short commit from the lock
file, or `—` when the lock file has no entry for the skill.

---

### `ponte subagents`

List the declared subagent sources with each source type and resolved
source. Prints `No subagents configured.` when the configuration declares
none. A subagent source carries no name, so the listing has no `NAME`
column.

```text
ponte subagents
```

---

### `ponte sysprompt`

Print the current system prompt to stdout, so you can pipe or redirect it.
Prints a notice to stderr when no system prompt is set.

```text
ponte sysprompt
ponte sysprompt > current-prompt.md
```

---

### `ponte sysprompt set <file-or-string>`

Write the system prompt to the file that `system_prompt_file` points at. For
a path to an existing file, ponte writes the contents of that file.
Otherwise ponte writes the argument itself. Run `ponte sync` afterwards to
reach the vendors.

```text
ponte sysprompt set ~/prompts/my-prompt.md
ponte sysprompt set "You are a helpful assistant."
```

---

### `ponte manual`

Print this manual to stdout.

```text
ponte manual | less
```

---

## Migration from a named skill table

An older ponte declared each skill and each subagent as a named table. That
form is now an error, because the name of a skill belongs in `SKILL.md` and
the name of a subagent is its file name.

1. Replace every `[skills.<name>]` section with `[[skills]]`.
2. Replace every `[subagents.<name>]` section with `[[subagents]]`.
3. Check that each skill source holds a `SKILL.md` with a `name` field.
4. Run `ponte sync`.

An old `.ponte/lock.toml` holds no `source` field, so ponte rejects it.
Delete `.ponte/lock.toml` and `.ponte/sources/`, then run `ponte sync`.

---

## Migration from home-manager

If home-manager manages `~/.claude/` or `~/.codex/` today, the existing
links point into `/nix/store/` and conflict with the links from ponte.

1. Remove the relevant `home.file` or `programs.*` entries from your
   home-manager flake.
2. Run `home-manager switch`. This removes the nix-store links.
3. Run `ponte sync`.

Do not run `ponte sync` before step 2. The next home-manager activation
overwrites the links from ponte.

---

## Cache

The git cache is at `~/.cache/ponte/sources/<hash>/`. A repository already
in the cache is fetched, not cloned again.

Vendor links for a git skill point into the cache. Do not delete a cache
directory while a vendor links to it. To start again, remove
`~/.cache/ponte/sources/` and run `ponte sync`.

A local skill needs no cache.
