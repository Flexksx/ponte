package adapter

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/flexksx/ponte/apps/ponte/internal/skill"
)

func GitCacheDirectoryPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".cache", "ponte", "sources"), nil
}

func statDir(path string) (os.FileInfo, error) {
	return os.Stat(path)
}

func resolveGit(cacheDir string, source skill.SkillSource) (string, error) {
	if source.GitRef == "" {
		return "", fmt.Errorf("git skill source %q requires a ref (commit SHA or tag)", source.GitURL)
	}

	sum := sha256.Sum256([]byte(source.GitURL))
	repoPath := filepath.Join(cacheDir, hex.EncodeToString(sum[:])[:16])

	if err := ensureCloned(repoPath, source.GitURL); err != nil {
		return "", err
	}

	if err := gitCheckout(repoPath, source.GitRef); err != nil {
		return "", err
	}

	if source.Subdir != "" {
		return filepath.Join(repoPath, source.Subdir), nil
	}
	return repoPath, nil
}

func ensureCloned(repoPath, url string) error {
	if _, err := os.Stat(filepath.Join(repoPath, ".git")); err == nil {
		if out, err := exec.Command("git", "-C", repoPath, "fetch", "origin").CombinedOutput(); err != nil {
			return fmt.Errorf("git fetch %s: %w\n%s", url, err, out)
		}
		return nil
	}

	if err := os.MkdirAll(filepath.Dir(repoPath), 0o755); err != nil {
		return err
	}
	if out, err := exec.Command("git", "clone", "--", url, repoPath).CombinedOutput(); err != nil {
		return fmt.Errorf("git clone %s: %w\n%s", url, err, out)
	}
	return nil
}

func gitCheckout(repoPath, ref string) error {
	if out, err := exec.Command("git", "-C", repoPath, "checkout", ref).CombinedOutput(); err != nil {
		return fmt.Errorf("git checkout %s in %s: %w\n%s", ref, repoPath, err, out)
	}
	return nil
}
