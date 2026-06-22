package e2e

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// Helpers for writing a config.toml with skills declared.

func writeConfigWithLocalSkill(t *testing.T, h *harness, skillName, skillDirPath string) {
	t.Helper()
	cfg := h.readFile(h.configFile())
	skillEntry := fmt.Sprintf("\n[skills.%s]\nsource = %q\n", skillName, skillDirPath)
	h.writeFile(h.configFile(), cfg+skillEntry)
}

func writeConfigWithGitSkill(t *testing.T, h *harness, skillName, repoURL, ref string) {
	t.Helper()
	cfg := h.readFile(h.configFile())
	skillEntry := fmt.Sprintf("\n[skills.%s]\nsource = %q\nref = %q\n", skillName, repoURL, ref)
	h.writeFile(h.configFile(), cfg+skillEntry)
}

// A local skill declared in config must appear as a symlink inside every
// enabled vendor's skills directory after sync.
func TestSkillSync_LocalSkill_AppearsInVendorSkillsDir(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()

	skillFixtureDir := repoFixtureDir(t, "simple_skill")
	writeConfigWithLocalSkill(t, h, "simple-skill", skillFixtureDir)

	h.mustRun("sync")

	for vendor, skillsDir := range h.vendorSkillsDirs() {
		t.Run(vendor, func(t *testing.T) {
			skillPath := filepath.Join(skillsDir, "simple-skill")
			skillMD := filepath.Join(skillPath, "SKILL.md")
			got := h.readFile(skillMD)
			if !strings.Contains(got, "simple-skill") {
				t.Errorf("expected SKILL.md to contain skill name, got:\n%s", got)
			}
		})
	}
}

// Vendor skill entries must be symlinks pointing into the ponte store, not
// copies. This is the core immutability guarantee.
func TestSkillSync_LocalSkill_IsSymlinkedFromStore(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()

	skillFixtureDir := repoFixtureDir(t, "simple_skill")
	writeConfigWithLocalSkill(t, h, "simple-skill", skillFixtureDir)

	h.mustRun("sync")

	h.assertIsStoreSymlink(h.vendorSkillPath("claude-code", "simple-skill"))
}

// Instruction files must also be symlinks into the store after sync.
func TestSkillSync_InstructionFile_IsSymlinkedFromStore(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()

	h.assertIsStoreSymlink(h.vendorPaths()["claude-code"])
}

// Two syncs with identical inputs produce the same store generation hash:
// the symlink target does not change and no new store directory is created.
func TestSkillSync_SameInputs_ReuseStoreGeneration(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()

	skillFixtureDir := repoFixtureDir(t, "simple_skill")
	writeConfigWithLocalSkill(t, h, "simple-skill", skillFixtureDir)
	h.mustRun("sync")

	firstTarget, err := os.Readlink(h.vendorPaths()["claude-code"])
	if err != nil {
		t.Fatalf("readlink: %v", err)
	}

	h.mustRun("sync")

	secondTarget, err := os.Readlink(h.vendorPaths()["claude-code"])
	if err != nil {
		t.Fatalf("readlink after second sync: %v", err)
	}
	if firstTarget != secondTarget {
		t.Errorf("expected same store generation on identical inputs\nfirst:  %s\nsecond: %s", firstTarget, secondTarget)
	}
}

// Adding a skill to the config changes the store generation: the symlink
// target moves to a new generation that contains the skill.
func TestSkillSync_AddingSkill_CreatesNewGeneration(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	h := newHarness(t)
	h.bootstrap()
	h.mustRun("sync")

	firstTarget, _ := os.Readlink(h.vendorPaths()["claude-code"])

	skillFixtureDir := repoFixtureDir(t, "simple_skill")
	writeConfigWithLocalSkill(t, h, "simple-skill", skillFixtureDir)
	h.mustRun("sync")

	secondTarget, _ := os.Readlink(h.vendorPaths()["claude-code"])
	if firstTarget == secondTarget {
		t.Error("expected a new store generation after adding a skill, but symlink target did not change")
	}

	// Skill must be present in the new generation.
	skillPath := h.vendorSkillPath("claude-code", "simple-skill")
	if _, err := os.Stat(skillPath); err != nil {
		t.Errorf("expected skill to exist at %s: %v", skillPath, err)
	}
}

// A git-backed skill is cloned, checked out at the given ref, and symlinked
// into vendor skill directories. Uses a local git repo as the remote to avoid
// network dependency.
func TestSkillSync_GitSkill_ClonesAndLinks(t *testing.T) {
	if isWindows() {
		t.Skip("symlink tests require Unix")
	}
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not available")
	}

	h := newHarness(t)
	h.bootstrap()

	repoPath, commitSHA := createLocalGitSkillRepo(t)

	writeConfigWithGitSkill(t, h, "git-skill", "file://"+repoPath, commitSHA)

	h.mustRun("sync")

	skillPath := h.vendorSkillPath("claude-code", "git-skill")
	skillMD := filepath.Join(skillPath, "SKILL.md")
	got := h.readFile(skillMD)
	if !strings.Contains(got, "git-skill") {
		t.Errorf("expected SKILL.md from git repo, got:\n%s", got)
	}
}

// createLocalGitSkillRepo initialises a bare git repo with a skill directory
// and returns the repo path and the HEAD commit SHA.
func createLocalGitSkillRepo(t *testing.T) (repoPath, commitSHA string) {
	t.Helper()
	dir := t.TempDir()

	mustGit := func(args ...string) string {
		t.Helper()
		out, err := exec.Command("git", args...).CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
		return strings.TrimSpace(string(out))
	}

	mustGitIn := func(dir string, args ...string) string {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("git %v in %s: %v\n%s", args, dir, err, out)
		}
		return strings.TrimSpace(string(out))
	}

	_ = mustGit

	mustGitIn(dir, "init")
	mustGitIn(dir, "config", "user.email", "test@example.com")
	mustGitIn(dir, "config", "user.name", "Test")

	skillMD := filepath.Join(dir, "SKILL.md")
	if err := os.WriteFile(skillMD, []byte("---\nname: git-skill\n---\n# Git Skill\n"), 0o644); err != nil {
		t.Fatalf("write SKILL.md: %v", err)
	}

	mustGitIn(dir, "add", ".")
	mustGitIn(dir, "commit", "-m", "add skill")

	sha := mustGitIn(dir, "rev-parse", "HEAD")
	return dir, sha
}

// repoFixtureDir returns the absolute path to a fixture directory.
func repoFixtureDir(t *testing.T, name string) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	p := filepath.Join(wd, "fixtures", name)
	if _, err := os.Stat(p); err != nil {
		t.Fatalf("fixture dir %s missing: %v", name, err)
	}
	return p
}
