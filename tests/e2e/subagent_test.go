package e2e

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeConfigWithLocalSubagent appends a [[subagents]] entry whose local source
// is a directory of agent files.
func writeConfigWithLocalSubagent(t *testing.T, h *harness, name, sourceDirPath string) {
	t.Helper()
	cfg := h.readFile(h.configFile())
	entry := fmt.Sprintf("\n[subagents.%s]\nsource = %q\n", name, sourceDirPath)
	h.writeFile(h.configFile(), cfg+entry)
}

// A local subagent source is a directory of agent files; each file must appear,
// flattened, inside every enabled vendor's agents directory after sync.
func TestSubagentSync_LocalSource_FilesAppearFlatInVendorAgentsDir(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()

	subagentsDir := repoFixtureDir(t, "subagents")
	writeConfigWithLocalSubagent(t, h, "claude", subagentsDir)

	h.mustRun("sync")

	for vendor := range h.vendorAgentsDirs() {
		t.Run(vendor, func(t *testing.T) {
			for _, agentFile := range []string{"code-investigator.md", "fullstack-agent.md"} {
				got := h.readFile(h.vendorAgentPath(vendor, agentFile))
				if !strings.Contains(got, agentFile[:len(agentFile)-len(".md")]) {
					t.Errorf("expected %s to contain its agent name, got:\n%s", agentFile, got)
				}
			}
		})
	}
}

// Subagent files must be symlinks into the store, not copies — same immutability
// guarantee as skills and instruction files.
func TestSubagentSync_FilesAreSymlinkedFromStore(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()

	subagentsDir := repoFixtureDir(t, "subagents")
	writeConfigWithLocalSubagent(t, h, "claude", subagentsDir)

	h.mustRun("sync")

	h.assertIsStoreSymlink(h.vendorAgentPath("claude-code", "code-investigator.md"))
}

// Adding a subagent changes the store generation: the instruction symlink moves
// to a new generation that also contains the subagent files.
func TestSubagentSync_AddingSubagent_CreatesNewGeneration(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sync")

	firstTarget, _ := os.Readlink(h.vendorPaths()["claude-code"])

	subagentsDir := repoFixtureDir(t, "subagents")
	writeConfigWithLocalSubagent(t, h, "claude", subagentsDir)
	h.mustRun("sync")

	secondTarget, _ := os.Readlink(h.vendorPaths()["claude-code"])
	if firstTarget == secondTarget {
		t.Error("expected a new store generation after adding a subagent, but symlink target did not change")
	}

	if _, err := os.Stat(h.vendorAgentPath("claude-code", "fullstack-agent.md")); err != nil {
		t.Errorf("expected subagent file to exist after sync: %v", err)
	}
}

// The instruction file must round-trip from an absolute system_prompt_file path
// outside ~/.config/ponte, so a config repo can own the prompt directly.
func TestSync_AbsoluteSystemPromptFile(t *testing.T) {
	h := newHarness(t)
	h.mustRun("sync") // bootstrap

	external := filepath.Join(h.home, "repo", "AGENTS.md")
	want := "# external prompt\n\nfrom the config repo\n"
	h.writeFile(external, want)

	cfg := h.readFile(h.configFile())
	cfg = strings.Replace(cfg,
		`system_prompt_file = "AGENTS.md"`,
		fmt.Sprintf("system_prompt_file = %q", external), 1)
	h.writeFile(h.configFile(), cfg)

	h.mustRun("sync")

	for _, path := range h.vendorPaths() {
		h.assertFileEquals(path, want)
	}
}
