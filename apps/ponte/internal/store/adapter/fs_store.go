package adapter

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"

	"github.com/flexksx/ponte/apps/ponte/internal/store"
)

const (
	instructionFileName = "instruction"
	skillsDirName       = "skills"
)

func StoreDirectoryPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".local", "share", "ponte", "store"), nil
}

func NewBuilder(storeDir string) store.GenerationBuilder {
	return func(input store.BuildInput) (store.Generation, error) {
		return build(storeDir, input)
	}
}

func Activate(gen store.Generation, instructionFilePath string, skillsDirPath string) error {
	storePath := filepath.Join(gen.RootPath, instructionFileName)
	if err := atomicSymlink(storePath, instructionFilePath); err != nil {
		return fmt.Errorf("linking instruction file: %w", err)
	}

	skillsInStore := filepath.Join(gen.RootPath, skillsDirName)
	entries, err := os.ReadDir(skillsInStore)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	if err := os.MkdirAll(skillsDirPath, 0o755); err != nil {
		return err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		storeSkillPath := filepath.Join(skillsInStore, entry.Name())
		vendorSkillPath := filepath.Join(skillsDirPath, entry.Name())
		if err := atomicSymlink(storeSkillPath, vendorSkillPath); err != nil {
			return fmt.Errorf("linking skill %q: %w", entry.Name(), err)
		}
	}
	return nil
}

func build(storeDir string, input store.BuildInput) (store.Generation, error) {
	hash, err := computeHash(input)
	if err != nil {
		return store.Generation{}, fmt.Errorf("computing generation hash: %w", err)
	}

	genPath := filepath.Join(storeDir, hash)
	if _, err := os.Stat(genPath); err == nil {
		return store.Generation{Hash: hash, RootPath: genPath}, nil
	}

	tmpPath := genPath + ".build"
	_ = os.RemoveAll(tmpPath)

	if err := os.MkdirAll(tmpPath, 0o755); err != nil {
		return store.Generation{}, err
	}

	if err := os.WriteFile(filepath.Join(tmpPath, instructionFileName), []byte(input.SystemPromptContent), 0o644); err != nil {
		_ = os.RemoveAll(tmpPath)
		return store.Generation{}, err
	}

	if len(input.Skills) > 0 {
		skillsPath := filepath.Join(tmpPath, skillsDirName)
		if err := os.MkdirAll(skillsPath, 0o755); err != nil {
			_ = os.RemoveAll(tmpPath)
			return store.Generation{}, err
		}
		for _, s := range input.Skills {
			destSkillPath := filepath.Join(skillsPath, s.Name)
			if err := copyDir(s.SourceDir, destSkillPath); err != nil {
				_ = os.RemoveAll(tmpPath)
				return store.Generation{}, fmt.Errorf("copying skill %q: %w", s.Name, err)
			}
		}
	}

	if err := os.Rename(tmpPath, genPath); err != nil {
		_ = os.RemoveAll(tmpPath)
		return store.Generation{}, err
	}

	// Best-effort: make immutable after successful rename. Not fatal if chmod fails
	// (e.g., some filesystems). Add chmod 0o755 to dirs before RemoveAll when adding GC.
	_ = makeReadOnly(genPath)

	return store.Generation{Hash: hash, RootPath: genPath}, nil
}

func computeHash(input store.BuildInput) (string, error) {
	h := sha256.New()

	promptHash := sha256.Sum256([]byte(input.SystemPromptContent))
	fmt.Fprintf(h, "systemprompt:%s\n", hex.EncodeToString(promptHash[:]))

	sorted := make([]store.ResolvedSkill, len(input.Skills))
	copy(sorted, input.Skills)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Name < sorted[j].Name })

	for _, s := range sorted {
		dirHash, err := hashDir(s.SourceDir)
		if err != nil {
			return "", fmt.Errorf("hashing skill %q: %w", s.Name, err)
		}
		fmt.Fprintf(h, "skill:%s:%s\n", s.Name, dirHash)
	}

	return hex.EncodeToString(h.Sum(nil))[:32], nil
}

func hashDir(dirPath string) (string, error) {
	h := sha256.New()
	err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		rel, _ := filepath.Rel(dirPath, path)
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		fileHash := sha256.Sum256(data)
		fmt.Fprintf(h, "%s:%s\n", rel, hex.EncodeToString(fileHash[:]))
		return nil
	})
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func copyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		destPath := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(destPath, 0o755)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(destPath, data, 0o644)
	})
}

func makeReadOnly(dirPath string) error {
	return filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, _ error) error {
		if d.IsDir() {
			return os.Chmod(path, 0o555)
		}
		return os.Chmod(path, 0o444)
	})
}

func atomicSymlink(target, link string) error {
	if err := os.MkdirAll(filepath.Dir(link), 0o755); err != nil {
		return err
	}
	if existing, err := os.Readlink(link); err == nil && existing == target {
		return nil
	}
	_ = os.Remove(link)
	return os.Symlink(target, link)
}
