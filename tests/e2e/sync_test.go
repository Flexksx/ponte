package e2e

import (
	"strings"
	"testing"
)

const samplePrompt = "# Sample prompt\n\nDo the right thing.\n"

// Golden path: prompt is set, then sync writes it verbatim to every enabled
// vendor's instruction file at the platform-specific location.
func TestSync_WritesPromptToEveryEnabledVendor(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", samplePrompt)
	h.mustRun("sync")

	for vendor, path := range h.vendorPaths() {
		t.Run(vendor, func(t *testing.T) {
			h.assertFileEquals(path, samplePrompt)
		})
	}
}

// `-a` selects a subset of vendors, even when others are enabled in config.
// Verifies both that the named vendor is written and that unselected ones are
// NOT touched.
func TestSync_AdHocAgentsFlag_OnlyWritesNamedVendors(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", samplePrompt)

	h.mustRun("sync", "-a", "claude-code,gemini-cli")

	// bootstrap wrote an empty prompt to every vendor; -a targets must be
	// updated, the rest must be left exactly as they were.
	paths := h.vendorPaths()
	h.assertFileEquals(paths["claude-code"], samplePrompt)
	h.assertFileEquals(paths["gemini-cli"], samplePrompt)
	h.assertFileEquals(paths["codex"], "")
	h.assertFileEquals(paths["cursor-agent"], "")
}

// `-a` accepts repeated flag form too. Both forms must work because cobra
// StringSlice supports comma-split AND repetition.
func TestSync_AgentsFlag_RepeatedForm(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", samplePrompt)

	h.mustRun("sync", "-a", "claude-code", "-a", "codex")

	paths := h.vendorPaths()
	h.assertFileEquals(paths["claude-code"], samplePrompt)
	h.assertFileEquals(paths["codex"], samplePrompt)
	h.assertFileEquals(paths["gemini-cli"], "")
	h.assertFileEquals(paths["cursor-agent"], "")
}

// `-a` with an unknown vendor must fail with a non-zero exit. Quietly skipping
// it would be a silent correctness bug.
func TestSync_UnknownAgent_Errors(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", samplePrompt)

	_, stderr, err := h.run("sync", "-a", "definitely-not-a-real-agent")
	if err == nil {
		t.Fatal("expected non-zero exit for unknown agent")
	}
	if !strings.Contains(stderr, "definitely-not-a-real-agent") {
		t.Errorf("expected unknown-agent name in stderr, got:\n%s", stderr)
	}
}

// `-g` inline overrides the stored prompt entirely. The stored prompt file
// must remain unchanged — the override is per-invocation only.
func TestSync_GlobalInstructionsFlag_InlineOverride(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", samplePrompt)

	override := "ephemeral override content"
	h.mustRun("sync", "-g", override)

	for _, path := range h.vendorPaths() {
		h.assertFileEquals(path, override)
	}
	// Stored prompt is untouched.
	h.assertFileEquals(h.promptFile("AGENTS.md"), samplePrompt)
}

// `-g <file>` reads the override from a file when the argument resolves to one.
// resolveContent prefers file-read; only falls back to literal if !os.IsExist.
func TestSync_GlobalInstructionsFlag_FileOverride(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", "stored content")

	fixture := repoFixturePath(t, "unicode_prompt.md")
	want := h.readFile(fixture)

	h.mustRun("sync", "-g", fixture)

	for _, path := range h.vendorPaths() {
		h.assertFileEquals(path, want)
	}
}

// Disabling a vendor in config.toml must skip it on sync. We mutate the file
// directly to assert the config is actually consulted.
func TestSync_DisabledVendor_IsSkipped(t *testing.T) {
	h := newHarness(t)
	h.mustRun("sync") // bootstrap — all vendors activated with empty prompt
	h.mustRun("sysprompt", "set", samplePrompt)

	// Disable codex by rewriting config.toml.
	cfg := h.readFile(h.configFile())
	cfg = strings.Replace(cfg,
		"[vendors.codex]\n    enabled = true",
		"[vendors.codex]\n    enabled = false", 1)
	if !strings.Contains(cfg, "[vendors.codex]\n    enabled = false") {
		t.Fatalf("failed to disable codex via TOML rewrite, config now:\n%s", cfg)
	}
	h.writeFile(h.configFile(), cfg)

	h.mustRun("sync")

	paths := h.vendorPaths()
	// Enabled vendors receive the new prompt.
	h.assertFileEquals(paths["claude-code"], samplePrompt)
	h.assertFileEquals(paths["gemini-cli"], samplePrompt)
	h.assertFileEquals(paths["cursor-agent"], samplePrompt)
	// Disabled vendor's symlink was not updated; it still points at the
	// bootstrap generation which contained an empty prompt.
	h.assertFileEquals(paths["codex"], "")
}

// Disabling all vendors and running sync without -a must fail with a clear
// "no agents enabled" message rather than silently succeeding.
func TestSync_NoEnabledVendors_Errors(t *testing.T) {
	h := newHarness(t)
	h.mustRun("sync") // bootstrap

	cfg := h.readFile(h.configFile())
	cfg = strings.ReplaceAll(cfg, "enabled = true", "enabled = false")
	h.writeFile(h.configFile(), cfg)

	_, stderr, err := h.run("sync")
	if err == nil {
		t.Fatal("expected non-zero exit when no agents are enabled")
	}
	if !strings.Contains(stderr, "no agents enabled") {
		t.Errorf("expected 'no agents enabled' in stderr, got:\n%s", stderr)
	}
}

// A custom `system_prompt_file` in config must be honoured by sync. The CLI
// reads from whatever name is configured, not always AGENTS.md.
func TestSync_CustomSystemPromptFile(t *testing.T) {
	h := newHarness(t)
	h.mustRun("sync") // bootstrap creates default AGENTS.md

	// Rewrite config to point at a different file name.
	cfg := h.readFile(h.configFile())
	cfg = strings.Replace(cfg,
		`system_prompt_file = "AGENTS.md"`,
		`system_prompt_file = "MY_PROMPT.md"`, 1)
	h.writeFile(h.configFile(), cfg)

	// sysprompt set writes through the new filename (it consults config too).
	custom := "custom-prompt-content"
	h.mustRun("sysprompt", "set", custom)

	// The new file is what got written, NOT AGENTS.md.
	h.assertFileEquals(h.promptFile("MY_PROMPT.md"), custom)

	h.mustRun("sync")
	for _, path := range h.vendorPaths() {
		h.assertFileEquals(path, custom)
	}
}

// Unicode, multi-byte runes, and embedded code blocks must round-trip without
// any encoding or line-ending mutation.
func TestSync_PreservesUnicodeAndFormatting(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	fixture := repoFixturePath(t, "unicode_prompt.md")
	want := h.readFile(fixture)

	h.mustRun("sysprompt", "set", fixture) // path arg → file read
	h.mustRun("sync")

	for _, path := range h.vendorPaths() {
		h.assertFileEquals(path, want)
	}
}

// Running sync twice back-to-back must produce identical vendor files —
// no timestamp drift, no appended duplicates.
func TestSync_IsIdempotent(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", samplePrompt)
	h.mustRun("sync")
	first := snapshotVendorFiles(t, h)

	h.mustRun("sync")
	second := snapshotVendorFiles(t, h)

	for k, v := range first {
		if second[k] != v {
			t.Errorf("vendor %s drifted between syncs:\nfirst:  %q\nsecond: %q", k, v, second[k])
		}
	}
}

// Sync after updating the stored prompt picks up the new content. This guards
// against any accidental caching in the writer.
func TestSync_RefreshesAfterPromptUpdate(t *testing.T) {
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", "v1")
	h.mustRun("sync")

	h.mustRun("sysprompt", "set", "v2")
	h.mustRun("sync")

	for _, path := range h.vendorPaths() {
		h.assertFileEquals(path, "v2")
	}
}

// `--help` exits cleanly and lists both top-level commands. A regression here
// usually means a cobra wiring bug, which would also break shell completion.
func TestSync_HelpListsSubcommands(t *testing.T) {
	h := newHarness(t)
	stdout, _ := h.mustRun("--help")
	for _, want := range []string{"sync", "sysprompt"} {
		if !strings.Contains(stdout, want) {
			t.Errorf("--help missing %q, got:\n%s", want, stdout)
		}
	}
}

// `--dry-run` resolves and reports the would-be generation but must not write
// to vendor files or create store generations.
func TestSync_DryRun_WritesNothing(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", "v1")
	h.mustRun("sync")

	generationsBefore := countStoreGenerations(t, h)
	before := snapshotVendorFiles(t, h)

	// Change the source, then dry-run: nothing should change on disk.
	h.mustRun("sysprompt", "set", "v2-dry")
	stdout, _ := h.mustRun("sync", "--dry-run")
	if !strings.Contains(stdout, "Dry run") {
		t.Errorf("expected dry-run notice, got:\n%s", stdout)
	}

	if after := countStoreGenerations(t, h); after != generationsBefore {
		t.Errorf("dry run created a generation: before=%d after=%d", generationsBefore, after)
	}
	for vendor, want := range before {
		h.assertFileEquals(h.vendorPaths()[vendor], want)
	}
}

func snapshotVendorFiles(t *testing.T, h *harness) map[string]string {
	t.Helper()
	snap := map[string]string{}
	for vendor, path := range h.vendorPaths() {
		snap[vendor] = h.readFile(path)
	}
	return snap
}
