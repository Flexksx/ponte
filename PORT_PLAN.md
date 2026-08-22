# ponte → TypeScript (Bun) rewrite

A rewrite from the Go source into idiomatic, functional, data-oriented
TypeScript. The Go code is the behavioral contract, not the design
contract. This plan keeps the on-disk format and the hash algorithm
identical, and redesigns the internals around pure data transforms.

---

## 1. Principles

- **Functional core, imperative shell.** The program is a pipeline of
  pure transforms over data (config objects, strings, path lists) with a
  thin layer of effects at the edges (file IO, git, symlinks).
- **Pure functions are total.** They never throw and never touch IO.
  Given data, they return data. Invalid input is rejected at the parse
  boundary, not inside a pure function.
- **Effects throw.** File reads, git commands, and symlinks throw on
  failure. `src/index.ts` catches once, prints the message to stderr,
  and exits non-zero.
- **Missing files are data, not errors.** A missing config or prompt
  file is an existence check that returns `null`, not an error case.
- **Data as plain immutable values.** Discriminated unions and
  `Readonly` records. No classes, no `this`, no DI containers, no
  framework.
- **Standard library first.** Bun and Node built-ins cover CLI parsing,
  hashing, copying, and symlinks. One dependency maximum, and only if
  `Bun.TOML` is not good enough.
- **The contract is the format.** `config.toml`, the store layout, the
  symlink targets, and the hash algorithm must stay byte-compatible.
  The internal Go structure is not a contract.

---

## 2. The two-layer model

Every command splits into a pure part and an effectful part. The pure
part carries the decisions; the effectful part carries the actions.

| Concern | Pure (no IO, no throw) | Effect (throws) |
|---------|------------------------|-----------------|
| Config | `decodeConfig`, `normalizeConfig`, `defaultConfig` | `readConfig`, `writeConfig` |
| Vendors | `vendorLayouts`, `enabledVendors`, `isVendor` | none |
| Sources | `parseSource`, `isGitSource`, `skillEnabledForVendor` | `resolveSource`, `ensureCloned`, `git` |
| Store | `computeHash`, `hashEntries`, `selectSkills` | `hashDir`, `buildGeneration`, `activate`, `listGenerations`, `readActiveHash`, `removeGeneration` |
| Prompt | none | `readPrompt`, `writePrompt`, `resolveContent` |
| CLI | `classifyState`, formatting helpers | command handlers, `run` |

The pure functions are the test surface. The effect functions are thin
glue, covered by temp-dir integration tests and the e2e suite.

Example: hashing splits so the algorithm is a pure function and only the
directory walk touches the disk.

```ts
// Pure: given a directory's files as (relative path, contents) pairs,
// return the same value Go's hashDir produces.
export function hashEntries(files: ReadonlyArray<readonly [rel: string, content: string]>): string {
  const body = files
    .map(([rel, content]) => `${rel}:${sha256Hex(content)}`)
    .join("\n") + "\n";
  return sha256Hex(body);
}
```

The effectful caller walks the directory, sorts the entries, reads each
file, and passes the pairs to `hashEntries`. The algorithm is testable
without a filesystem.

---

## 3. Module layout

Flat modules by concern. No `types.ts` / `port.ts` / `adapter/`
subfolders; those mirror Go's package structure, not the domain.

```
src/
  index.ts      entry point: parse argv, dispatch, catch errors, set exit code
  cli.ts        command handlers, flag parsing, table output
  config.ts     Config type, TOML decode + validate + normalize, read/write
  vendors.ts    vendor catalog: names and per-OS path layouts
  sources.ts    SkillSource parse and resolve (local dir, git clone/checkout)
  store.ts      hash, build generation, activate, list, active hash, gc
  prompt.ts     system prompt read/write, resolveContent (file-or-literal)
  manual.md     embedded text, imported with `with { type: "text" }`

tests/
  config.test.ts
  vendors.test.ts
  sources.test.ts
  store.test.ts
  cli.test.ts
  e2e/
    harness.ts
    sync.test.ts
    status.test.ts
    gc.test.ts
    ...
```

Responsibilities:

- `config.ts` owns the config schema and everything that reads or writes
  `~/.config/ponte/`. The system prompt lives in that directory too, but
  prompt IO is small and separate enough to warrant `prompt.ts`.
- `sources.ts` owns "turn a source string into a directory path" for
  both skills and subagents. Local and git share the same `SkillSource`
  union.
- `store.ts` owns the content-addressed store: hashing, building,
  activation, listing, and garbage collection.
- `vendors.ts` owns the vendor catalog. A single `as const` array is the
  source of truth for both the type and the iteration order.
- `cli.ts` owns the command table and presentation. It imports from the
  other modules; nothing imports from it.

---

## 4. Data model

### 4.1 Vendors

```ts
export const VENDORS = ["claude-code", "codex", "gemini-cli", "cursor-agent"] as const;
export type VendorName = (typeof VENDORS)[number];

export const isVendor = (s: string): s is VendorName =>
  (VENDORS as readonly string[]).includes(s);

export type VendorLayout = {
  readonly instruction: string;   // absolute path to the instruction file
  readonly skills: string;        // absolute path to the skills directory
  readonly agents: string;        // absolute path to the agents directory
};

export function vendorLayouts(home: string, platform: NodeJS.Platform): Record<VendorName, VendorLayout>;
```

The union type is derived from the array, so adding a vendor means
editing one line. The POSIX and Windows root tables stay as data maps,
keyed by `VendorName`.

### 4.2 Sources

```ts
export type SkillSource =
  | { readonly type: "local"; readonly path: string }
  | { readonly type: "git"; readonly url: string; readonly ref: string; readonly subdir?: string };
```

The discriminated union replaces Go's struct with a type field plus
optional fields for every case. `parseSource` produces it:

```ts
const GIT_SOURCE = /^(https?:\/\/|git@|file:\/\/)/;

export const isGitSource = (source: string): boolean => GIT_SOURCE.test(source);

export function parseSource(source: string, ref = "", subdir = ""): SkillSource {
  return isGitSource(source)
    ? { type: "git", url: source, ref, subdir: subdir || undefined }
    : { type: "local", path: source };
}
```

### 4.3 Config

```ts
export type VendorSkillConfig = { readonly enabled?: boolean };

export type SkillEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
  readonly vendors?: Partial<Record<VendorName, VendorSkillConfig>>;
};

export type SubagentEntry = {
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type Config = {
  readonly systemPromptFile: string;
  readonly vendors: Partial<Record<VendorName, { readonly enabled: boolean }>>;
  readonly skills: Readonly<Record<string, SkillEntry>>;
  readonly subagents: Readonly<Record<string, SubagentEntry>>;
};
```

### 4.4 Store

```ts
export type ResolvedSkill = { readonly name: string; readonly sourceDir: string };
export type ResolvedSubagent = { readonly name: string; readonly sourceDir: string };

export type BuildInput = {
  readonly prompt: string;
  readonly skills: readonly ResolvedSkill[];
  readonly subagents: readonly ResolvedSubagent[];
};

export type Generation = { readonly hash: string; readonly rootPath: string };
```

---

## 5. Config: decode, validate, normalize

### 5.1 Canonical TOML schema

```toml
# ~/.config/ponte/config.toml
system_prompt_file = "AGENTS.md"

[vendors.claude-code]
enabled = true

[vendors.codex]
enabled = true

[vendors.gemini-cli]
enabled = true

[vendors.cursor-agent]
enabled = false

[skills.software-engineering]
source = "skills/software-engineering"     # relative to ~/.config/ponte/

[skills.ast-grep]
source = "https://github.com/example/ast-grep-skill"
ref    = "a1b2c3d4e5f6..."                  # full commit SHA recommended
subdir = "skills/ast-grep"                  # optional

[skills.ast-grep.vendors.gemini-cli]
enabled = false

[subagents.claude]
source = "subagents/claude"                 # directory of agent files
```

Keyed tables (`[skills.<name>]`), not arrays of tables. This matches the
Go implementation and the manual's full-schema section.

### 5.2 Decode

`Bun.TOML.parse` (spike in Phase 1) or `smol-toml` returns
`Record<string, unknown>`. A small hand-rolled decoder turns that into a
`Config` and reports every problem at once, not the first one:

```ts
export function decodeConfig(value: unknown): Config {
  const problems: string[] = [];
  const root = record(value, "config", problems) ?? {};
  const systemPromptFile = str(root.system_prompt_file, "system_prompt_file", problems);
  // ... vendors, skills, subagents ...
  if (problems.length > 0) throw new ConfigError(problems);
  return normalize({ systemPromptFile, vendors, skills, subagents }, configDir);
}
```

`normalize` fills defaults and expands relative local paths against the
config directory, returning a new object. It never mutates the decoded
value.

### 5.3 Behavior to preserve

- Absent `system_prompt_file` defaults to `AGENTS.md`.
- A vendor omitted from `config.toml` is disabled. The Go code does not
  merge `DefaultConfig` vendors into a hand-written config; `status` and
  `sync` both treat an absent vendor as `enabled: false`. Preserve this.
- A relative local source path resolves against `~/.config/ponte/`.
- A git source path is left untouched.

### 5.4 Doc bugs to fix

The repo docs disagree with the Go code in three places. Fix them in the
same change, since the rewrite must read the real format:

1. `README.md` uses `[agents.<vendor>]`; the code uses `[vendors.<vendor>]`.
2. `README.md` uses `[[skills]]` with a nested `[skills.source]` table;
   the code uses `[skills.<name>]` with flat `source`/`ref`/`subdir`.
3. `MANUAL.md`'s subagents section uses `[[subagents]]` with
   `[subagents.source]`; the code uses `[subagents.<name>]` flat.

---

## 6. Sources: parse and resolve

`parseSource` and `isGitSource` are pure (Section 4.2). Resolution is
effectful:

```ts
export async function resolveSource(s: SkillSource, cacheDir: string): Promise<string> {
  switch (s.type) {
    case "local": {
      const info = await stat(s.path);   // throws when missing
      if (!info.isDirectory()) throw new Error(`skill source is not a directory: ${s.path}`);
      return s.path;
    }
    case "git": {
      if (!s.ref) throw new Error(`git source ${s.url} needs a ref`);
      const repo = join(cacheDir, sha256Hex(s.url).slice(0, 16));
      await ensureCloned(repo, s.url);
      await git(["checkout", s.ref], repo);
      return s.subdir ? join(repo, s.subdir) : repo;
    }
  }
}
```

`ensureCloned` runs `git clone` when `repo/.git` is absent, otherwise
`git fetch origin`. `git` is a small wrapper over `Bun.$` that throws
when `exitCode` is non-zero, carrying `stderr`.

Vendor-specific skill filtering is a pure function, separated from
resolution:

```ts
export function skillEnabledForVendor(entry: SkillEntry, vendor: VendorName): boolean {
  const override = entry.vendors?.[vendor]?.enabled;
  return override !== false;
}
```

Only an explicit `enabled = false` disables a skill for a vendor.
Absence and `enabled = true` both mean enabled.

---

## 7. Store: hash, build, activate, gc

### 7.1 Hashing

```ts
import { createHash } from "node:crypto";

const sha256Hex = (s: string): string =>
  createHash("sha256").update(s).digest("hex");

// Pure. See Section 12 for the exact algorithm Go implements.
export function computeHash(
  prompt: string,
  skills: ReadonlyArray<readonly [name: string, dirHash: string]>,
  subagents: ReadonlyArray<readonly [name: string, dirHash: string]>,
): string {
  const byName = (a: readonly [string, string], b: readonly [string, string]) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  const lines = [
    `systemprompt:${sha256Hex(prompt)}`,
    ...[...skills].sort(byName).map(([name, h]) => `skill:${name}:${h}`),
    ...[...subagents].sort(byName).map(([name, h]) => `subagent:${name}:${h}`),
  ];
  return sha256Hex(lines.join("\n") + "\n").slice(0, 32);
}

// Effectful: walk a directory, sort entries, hash each file, delegate to hashEntries.
export async function hashDir(dir: string): Promise<string>;
```

`computeHash` is fully pure: it receives already-computed directory
hashes. Callers compute those hashes first. This is the main difference
from the Go version, where `ComputeHash` both walks directories and
combines results.

### 7.2 Build

```ts
export async function buildGeneration(input: BuildInput, storeDir: string): Promise<Generation> {
  const hash = await hashBuildInput(input);
  const genDir = join(storeDir, hash);
  if (await exists(genDir)) return { hash, rootPath: genDir };

  const tmp = `${genDir}.build`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });

  await writeFile(join(tmp, "instruction"), input.prompt);
  for (const s of input.skills) await cp(s.sourceDir, join(tmp, "skills", s.name), { recursive: true });
  for (const a of input.subagents) await cp(a.sourceDir, join(tmp, "subagents", a.name), { recursive: true });

  await rename(tmp, genDir);
  await makeReadOnly(genDir);   // best-effort
  return { hash, rootPath: genDir };
}
```

`fs.cp(src, dst, { recursive: true })` replaces Go's hand-written
`copyDir`. The atomic rename onto the final hash-named directory is the
content-addressing invariant; keep it exactly.

### 7.3 Activate

```ts
export async function activate(gen: Generation, layout: VendorLayout): Promise<void> {
  await symlinkAtomic(join(gen.rootPath, "instruction"), layout.instruction);
  await linkDir(join(gen.rootPath, "skills"), layout.skills, { flat: false });
  await linkDir(join(gen.rootPath, "subagents"), layout.agents, { flat: true });
}

async function symlinkAtomic(target: string, link: string): Promise<void> {
  await mkdir(dirname(link), { recursive: true });
  try {
    if (await readlink(link) === target) return;   // already points here
  } catch {}                                        // link absent, fall through
  await rm(link, { force: true });
  await symlink(target, link);
}
```

`linkDir` with `flat: true` flattens the subagents tree by basename into
the vendor agents directory, matching Go. Skills are linked one directory
per skill (`flat: false`).

### 7.4 List, active hash, gc

```ts
export async function listGenerations(storeDir: string): Promise<Generation[]>;
export async function readActiveHash(instructionPath: string): Promise<string | null>;
export async function removeGeneration(gen: Generation): Promise<void>;
```

- `listGenerations` lists directories that do not end in `.build`; a
  missing store directory yields an empty list, not an error.
- `readActiveHash` resolves a symlink, checks the target sits under the
  store, and returns the hash segment or `null`. Absent, plain-file, or
  out-of-store targets all return `null`.
- `removeGeneration` restores write permissions, then `rm` recursive.

The gc decision itself is pure:

```ts
export function planGc(
  generations: readonly Generation[],
  activeHashes: ReadonlySet<string>,
): { readonly remove: readonly Generation[]; readonly keep: readonly Generation[] };
```

`cli.ts` runs `planGc`, then calls `removeGeneration` on the `remove`
list unless `--dry-run`.

---

## 8. System prompt and content helpers

```ts
export async function readPrompt(filename: string): Promise<string | null>;
export async function writePrompt(filename: string, content: string): Promise<void>;
export async function resolveContent(arg: string): Promise<string>;
```

- `readPrompt` resolves a bare filename against `~/.config/ponte/`, an
  absolute path as-is, and returns `null` when the file is absent.
- `resolveContent` returns file contents when the argument names an
  existing file, otherwise the argument verbatim.

---

## 9. CLI

### 9.1 Flag parsing

Use Node's built-in `util.parseArgs`, not a hand-rolled parser:

```ts
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args,
  options: {
    "global-instructions": { type: "string", short: "g" },
    agents: { type: "string", short: "a", multiple: true },
    "dry-run": { type: "boolean" },
  },
  allowPositionals: true,
});
```

`multiple: true` collects repeated `-a` flags; the comma-split is a
one-line post-process: `agents.flatMap((a) => a.split(","))`.

### 9.2 Command table

```ts
type Command = (args: string[]) => Promise<void>;

const commands: Record<string, Command> = {
  sync: runSync,
  status: runStatus,
  gc: runGc,
  skills: runSkills,
  subagents: runSubagents,
  sysprompt: runSysprompt,
  manual: runManual,
};

export async function run(argv: string[]): Promise<number> {
  const [commandName, ...args] = argv;
  const command = commands[commandName];
  if (!command) {
    process.stderr.write(`unknown command: ${commandName}\n`);
    return 2;
  }
  try {
    await command(args);
    return 0;
  } catch (error) {
    process.stderr.write(formatError(error) + "\n");
    return 1;
  }
}
```

`src/index.ts` calls `run(Bun.argv.slice(2))` and passes the return
value to `process.exit`.

### 9.3 Each command is a pure plan plus effects

`runSync`:

```ts
async function runSync(args: string[]): Promise<void> {
  const flags = parseSyncFlags(args);
  let cfg = await readConfig();
  if (cfg === null) {
    cfg = await bootstrap();            // write default config + empty prompt
  }
  const prompt = flags.globalInstructions
    ? await resolveContent(flags.globalInstructions)
    : await readPrompt(cfg.systemPromptFile);
  const targets = flags.agents ?? enabledVendors(cfg);

  const storeDir = storeDirectoryPath();
  const layouts = vendorLayouts(home(), platform());
  for (const vendor of targets) {
    const input = await resolveBuildInput(cfg, prompt, vendor);   // effect: source resolution
    if (flags.dryRun) {
      lastHash = await hashBuildInput(input);
      continue;
    }
    const gen = await buildGeneration(input, storeDir);
    lastHash = gen.hash;
    await activate(gen, layouts[vendor]);
  }
  printSyncResult(lastHash, targets, flags.dryRun);
}
```

The pure pieces are `enabledVendors`, `skillEnabledForVendor`, and
`classifyState`. `resolveBuildInput` is effectful because it resolves git
and local sources, but the filtering inside it (`selectSkills`) is pure.

`runStatus` calls `classifyState(vendor, wouldBeHash)` which is pure and
returns `"in sync" | "drifted" | "not synced" | "disabled"`; the
formatting is a separate function.

### 9.4 Output

Plain text to `process.stdout`, errors to `process.stderr`. No color
library. Table formatting uses `padEnd` instead of `fmt.Fprintf`
width specifiers:

```ts
const row = [name.padEnd(12), yesNo.padEnd(7), active.padEnd(12), state].join("  ");
```

---

## 10. Error handling

- Effects throw `Error` (or a small `ConfigError` that carries the list
  of problems). The message is the user-facing text.
- `src/index.ts` catches once, writes the message to stderr, exits 1.
- Missing files return `null` from the read function; callers check.
- There is no `Result<T, E>` type, no branded error tags, no sentinel
  errors. Those mirror Go's `(T, error)` and `errors.Is`; idiomatic
  TypeScript uses exceptions plus explicit existence checks.

The two cases Go modeled as sentinel errors become existence checks:

| Go sentinel | TS |
|-------------|-----|
| `ErrConfigNotInitialized` | `readConfig()` returns `null` when `config.toml` is absent; `sync` bootstraps |
| `ErrNoSystemPrompt` | `readPrompt()` returns `null`; `sysprompt` prints a notice |

`ConfigError` is the one structured error, and only because validation
must report every problem at once:

```ts
export class ConfigError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(problems.join("\n"));
    this.problems = problems;
  }
}
```

---

## 11. Testing

### 11.1 Pure functions (unit tests)

Direct tests with plain data. No mocks, no temp dirs:

- `computeHash` with known string inputs.
- `hashEntries` with known `(rel, content)` pairs.
- `parseSource` / `isGitSource` across URL schemes and local paths.
- `decodeConfig` with valid, invalid, and partial TOML objects.
- `enabledVendors` and `skillEnabledForVendor` across vendor overrides.
- `planGc` and `classifyState`.

### 11.2 Effects (temp-dir integration tests)

`bun:test` plus `Bun.tmpdir()` and the real functions:

- `buildGeneration` writes the expected tree and reuses an existing
  generation when the hash matches.
- `activate` creates symlinks; `readActiveHash` resolves them back.
- `resolveSource` for a local directory; git resolution only in CI or
  with a local `file://` repo fixture.
- `readConfig` / `writeConfig` round-trip.
- `removeGeneration` clears read-only trees.

### 11.3 End-to-end

Keep the same fixtures and shape as the Go e2e. `tests/e2e/harness.ts`
replaces the Go harness: isolated `$HOME`, platform-specific vendor
paths, and a subprocess runner via `Bun.$` against the built or
`bun run` entry point.

### 11.4 Mocking

`mock.module()` from `bun:test` is available for the rare case where a
command needs a stubbed effect. It is the exception, not the default.
Most tests never mock because the pure/effect split removes the need.

---

## 12. Hash compatibility

The TS hash must match Go byte-for-byte so existing stores stay valid.

Go produces, per skill sorted by name: `skill:<name>:<dirHash>`, and per
subagent sorted by name: `subagent:<name>:<dirHash>`, plus one
`systemprompt:<sha256(prompt)>` line, then hashes the joined lines
(with a trailing newline) and truncates to 32 hex chars.

`hashDir` hashes `relpath:<sha256(contents)>` per file, with a trailing
newline, walking entries in lexical order.

Two correctness requirements:

1. **Sort directory entries lexically before hashing.** Go's
   `filepath.WalkDir` sorts entries; Node's `readdir` does not. Sort the
   relative paths explicitly.
2. **Relative paths use the platform separator.** Go uses
   `filepath.Rel`. On Windows that is `\`. Match the separator of the
   running OS, or hashes diverge from Go's on Windows.

Verification: a golden test that hashes a known directory and asserts
the exact Go-produced string. Generate the golden value from the Go
binary once, then hard-code it.

---

## 13. Dependencies

| Package | Used for | Notes |
|---------|----------|-------|
| `Bun.TOML` | TOML parsing | Spike first; zero deps if it round-trips |
| `smol-toml` | TOML parsing fallback | Only if `Bun.TOML` is missing or lossy |
| Node built-ins | hashing, fs, args, paths | Free with Bun |

Everything else is Bun built-ins. No test framework dependency, no color
library, no effect/fp-ts/zod.

---

## 14. Nix packaging

Unchanged from the current plan:

- Dev shell: `bun` in `nix/devtools.nix`.
- Package: `bun build ./src/index.ts --compile --outfile $out/bin/ponte`.
- `bun test` in `checkPhase`.
- `nix/hm-module.nix` stays; the generated `config.toml` format is the
  same. The only change is the default `package`.

Text imports (`manual.md` via `with { type: "text" }`) are embedded by
`bun build --compile`; verify in Phase 1 that the path resolves.

---

## 15. Implementation order

Each phase produces a runnable, tested increment.

### Phase 1: Spike
- `Bun.TOML` round-trip test against a known config.
- `with { type: "text" }` import under `bun build --compile`.
- `node:util` `parseArgs` behavior for `-a` repetition and `--dry-run`.
- `fs.readdir(..., { recursive: true })` availability and ordering.

### Phase 2: Pure core
- `vendors.ts` (catalog + layouts).
- `config.ts` decode/normalize (pure parts).
- `store.ts` hash functions.
- `sources.ts` parse functions.
- Tests for all pure functions.

### Phase 3: Effects
- `config.ts` read/write.
- `prompt.ts` read/write/resolveContent.
- `sources.ts` resolve (local + git).
- `store.ts` build/activate/list/active-hash/gc.
- Temp-dir integration tests.

### Phase 4: CLI
- `cli.ts` command table, flag parsing, formatting.
- `index.ts` dispatch and error boundary.
- Tests for classification and formatting.

### Phase 5: End-to-end
- Port the Go e2e fixtures and tests.
- Run against isolated homes.

### Phase 6: Packaging and docs
- Nix package + dev shell.
- CI (`bun install`, `bun test`).
- Fix the three README/MANUAL config-format inconsistencies.

---

## 16. What changed from the Go design

Deliberate removals and replacements:

- **UseCase structs with function fields** are gone. Plain functions,
  `mock.module()` where needed, and the pure/effect split replace them.
- **`port.go` function types** are gone. Type aliases live beside the
  implementation in one module.
- **`adapter/` subfolders** are gone. Each concern is one flat module.
- **`Result<T, E>` and branded error tags** are gone. Exceptions plus
  existence checks replace them.
- **Sentinel errors** are gone. Missing files return `null`.
- **`IsInstalled`** is dead code in Go; it is not ported.
- **`cobra`** is replaced by `util.parseArgs` and a hand-written command
  table.
- **`go:embed`** is replaced by `with { type: "text" }`.
- **Hand-written `copyDir` / `WalkDir`** are replaced by `fs.cp` and
  `readdir({ recursive: true })`.
- **`Fprintf` hash string building** is replaced by building an array of
  lines and joining them.

The three config-format doc inconsistencies (Section 5.4) are fixed as
part of this work.

---

## 17. Migration

No data migration and no config migration.

- Same `config.toml` format.
- Same store path and same hash algorithm.
- Existing generations stay valid; the first `ponte sync` after the
  switch is a no-op when nothing changed.
- The only user-visible change is minor CLI output formatting.
