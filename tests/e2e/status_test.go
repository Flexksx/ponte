package e2e

import (
	"strings"
	"testing"
)

// After a sync with no source changes, every enabled vendor must report "in
// sync" against the would-be generation.
func TestStatus_InSyncAfterSync(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", "stable")
	h.mustRun("sync")

	stdout, _ := h.mustRun("status")
	if !strings.Contains(stdout, "Would-be generation:") {
		t.Errorf("expected would-be generation line, got:\n%s", stdout)
	}
	if !strings.Contains(stdout, "in sync") {
		t.Errorf("expected at least one vendor 'in sync', got:\n%s", stdout)
	}
}

// Changing the prompt after a sync must surface as drift in status, since the
// would-be generation no longer matches what is activated.
func TestStatus_DriftAfterSourceChange(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sysprompt", "set", "v1")
	h.mustRun("sync")

	// Change the source but do NOT sync.
	h.mustRun("sysprompt", "set", "v2-unsynced")

	stdout, _ := h.mustRun("status")
	if !strings.Contains(stdout, "drifted") {
		t.Errorf("expected drift after unsynced source change, got:\n%s", stdout)
	}
}

// A disabled vendor must be reported as "disabled" rather than drifted.
func TestStatus_DisabledVendorReported(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()

	cfg := h.readFile(h.configFile())
	cfg = strings.Replace(cfg,
		"[vendors.codex]\n    enabled = true",
		"[vendors.codex]\n    enabled = false", 1)
	h.writeFile(h.configFile(), cfg)

	stdout, _ := h.mustRun("status")
	if !strings.Contains(stdout, "disabled") {
		t.Errorf("expected a 'disabled' vendor in status, got:\n%s", stdout)
	}
}
