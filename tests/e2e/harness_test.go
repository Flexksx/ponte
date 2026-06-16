package e2e

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)


// harness is the per-test fixture: an isolated $HOME, a precomputed set of
// paths the CLI is expected to read and write, and a way to invoke the binary
// without leaking environment from the developer's machine.
type harness struct {
	t        *testing.T
	home     string
	configBy func(name string) string
}

// newHarness creates a fresh, isolated $HOME for one test. t.TempDir() is
// auto-cleaned up, and we override every env var the CLI (transitively via
// os.UserHomeDir) reads to derive paths.
func newHarness(t *testing.T) *harness {
	t.Helper()
	home := t.TempDir()

	// The ponte store makes its directories and files read-only (0o555/0o444) for
	// immutability. t.TempDir()'s RemoveAll cleanup cannot delete read-only paths,
	// so we register a cleanup that restores write permissions first. Cleanups run
	// in LIFO order, so this registered-after cleanup runs before TempDir's own.
	t.Cleanup(func() {
		_ = filepath.Walk(home, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			return os.Chmod(path, 0o755)
		})
	})

	// On Windows os.UserHomeDir() prefers %USERPROFILE%; on Unix it reads $HOME.
	// We set both so the same harness works regardless of GOOS. We also wipe
	// XDG_CONFIG_HOME to prevent leakage in case future code starts honouring it.
	return &harness{
		t:    t,
		home: home,
		configBy: func(name string) string {
			return filepath.Join(home, ".config", "ponte", name)
		},
	}
}

// run invokes the ponte binary with the given args and returns the captured
// stdout, stderr, and error.
func (h *harness) run(args ...string) (stdout, stderr string, err error) {
	h.t.Helper()
	cmd := exec.Command(binaryPath, args...)
	cmd.Env = h.env()
	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf
	err = cmd.Run()
	return outBuf.String(), errBuf.String(), err
}

// bootstrap runs `sync` once to initialise the on-disk config + default
// system prompt file, then discards the output. Use it from tests that need a
// ready config but aren't themselves asserting on the init behaviour.
func (h *harness) bootstrap() {
	h.t.Helper()
	h.mustRun("sync")
}

// mustRun is run() that fails the test immediately on non-zero exit.
func (h *harness) mustRun(args ...string) (stdout, stderr string) {
	h.t.Helper()
	stdout, stderr, err := h.run(args...)
	if err != nil {
		h.t.Fatalf("ponte %s\nexit=%v\nstdout:\n%s\nstderr:\n%s",
			strings.Join(args, " "), err, stdout, stderr)
	}
	return stdout, stderr
}

// env returns a minimal environment with HOME overrides. We deliberately keep
// PATH (for child-process lookups) and a few essentials, but strip the user's
// real config so tests are deterministic.
func (h *harness) env() []string {
	keep := map[string]bool{
		"PATH":        true,
		"SYSTEMROOT":  true, // Windows: required for net/http and other stdlib
		"TEMP":        true,
		"TMP":         true,
		"TMPDIR":      true,
		"LANG":        true,
		"LC_ALL":      true,
		"GOPATH":      true,
		"GOCACHE":     true,
		"COMSPEC":     true,
		"PATHEXT":     true,
		"WINDIR":      true,
		"PROGRAMDATA": true,
	}
	env := []string{
		"HOME=" + h.home,
		"USERPROFILE=" + h.home,
		"XDG_CONFIG_HOME=", // explicit empty to prevent any future override
	}
	for _, e := range os.Environ() {
		k, _, ok := strings.Cut(e, "=")
		if !ok {
			continue
		}
		if keep[strings.ToUpper(k)] {
			env = append(env, e)
		}
	}
	return env
}

// configFile is the on-disk config.toml.
func (h *harness) configFile() string { return h.configBy("config.toml") }

// promptFile returns the path to the configured system prompt file (defaults to
// AGENTS.md when the caller hasn't overridden it).
func (h *harness) promptFile(name string) string { return h.configBy(name) }

// vendorPaths returns the per-vendor instruction file path the CLI is expected
// to write under the isolated home. Mirrors agentvendor/adapter/systemconfig.go.
func (h *harness) vendorPaths() map[string]string {
	if runtime.GOOS == "windows" {
		roaming := filepath.Join(h.home, "AppData", "Roaming")
		return map[string]string{
			"claude-code":  filepath.Join(roaming, "Claude", "CLAUDE.md"),
			"codex":        filepath.Join(roaming, "Codex", "instructions.md"),
			"gemini-cli":   filepath.Join(roaming, "Gemini", "GEMINI.md"),
			"cursor-agent": filepath.Join(roaming, "Cursor", "rules", "global.mdc"),
		}
	}
	return map[string]string{
		"claude-code":  filepath.Join(h.home, ".claude", "CLAUDE.md"),
		"codex":        filepath.Join(h.home, ".codex", "instructions.md"),
		"gemini-cli":   filepath.Join(h.home, ".gemini", "GEMINI.md"),
		"cursor-agent": filepath.Join(h.home, ".cursor", "rules", "global.mdc"),
	}
}

// vendorSkillsDirs returns the per-vendor skills directory path.
func (h *harness) vendorSkillsDirs() map[string]string {
	if runtime.GOOS == "windows" {
		roaming := filepath.Join(h.home, "AppData", "Roaming")
		return map[string]string{
			"claude-code":  filepath.Join(roaming, "Claude", "skills"),
			"codex":        filepath.Join(roaming, "Codex", "skills"),
			"gemini-cli":   filepath.Join(roaming, "Gemini", "skills"),
			"cursor-agent": filepath.Join(roaming, "Cursor", "skills"),
		}
	}
	return map[string]string{
		"claude-code":  filepath.Join(h.home, ".claude", "skills"),
		"codex":        filepath.Join(h.home, ".codex", "skills"),
		"gemini-cli":   filepath.Join(h.home, ".gemini", "skills"),
		"cursor-agent": filepath.Join(h.home, ".cursor", "skills"),
	}
}

// vendorSkillPath returns the path to a named skill inside a vendor's skills directory.
func (h *harness) vendorSkillPath(vendor, skillName string) string {
	return filepath.Join(h.vendorSkillsDirs()[vendor], skillName)
}

// storePath returns the path to the ponte store under the isolated home.
func (h *harness) storePath() string {
	return filepath.Join(h.home, ".local", "share", "ponte", "store")
}

// storeIsSymlink asserts that path is a symlink pointing into the ponte store.
func (h *harness) assertIsStoreSymlink(path string) {
	h.t.Helper()
	target, err := os.Readlink(path)
	if err != nil {
		h.t.Fatalf("expected %s to be a symlink, got: %v", path, err)
	}
	if !strings.HasPrefix(target, h.storePath()) {
		h.t.Errorf("expected symlink target to be inside store %s, got %s", h.storePath(), target)
	}
}

// writeSkillFixture creates a minimal skill directory at the given path.
func (h *harness) writeSkillFixture(skillDir, content string) {
	h.t.Helper()
	h.writeFile(filepath.Join(skillDir, "SKILL.md"), content)
}

// readFile reads a file and fails the test on error.
func (h *harness) readFile(path string) string {
	h.t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		h.t.Fatalf("read %s: %v", path, err)
	}
	return string(data)
}

// writeFile writes content with parent dirs created.
func (h *harness) writeFile(path, content string) {
	h.t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		h.t.Fatalf("mkdir %s: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		h.t.Fatalf("write %s: %v", path, err)
	}
}

// assertFileEquals checks a file exists and matches the expected content
// byte-for-byte; this is the strongest property our sync flow guarantees.
func (h *harness) assertFileEquals(path, want string) {
	h.t.Helper()
	got := h.readFile(path)
	if got != want {
		h.t.Errorf("content mismatch at %s\n--- want ---\n%q\n--- got ---\n%q", path, want, got)
	}
}

// isWindows is a tiny readability wrapper used by Unix-only tests.
func isWindows() bool { return runtime.GOOS == "windows" }

// repoFixturePath returns the absolute path to a file under tests/e2e/fixtures.
func repoFixturePath(t *testing.T, name string) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	p := filepath.Join(wd, "fixtures", name)
	if _, err := os.Stat(p); err != nil {
		t.Fatalf("fixture %s missing: %v", name, err)
	}
	return p
}
