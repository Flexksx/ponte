package adapter

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"

	"github.com/flexksx/ponte/apps/ponte/internal/config"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
)

const configFileName = "config.toml"

func ConfigDirectoryPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "ponte"), nil
}

func ReadConfig() (config.Config, error) {
	dir, err := ConfigDirectoryPath()
	if err != nil {
		return config.Config{}, err
	}
	path := filepath.Join(dir, configFileName)
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return config.Config{}, config.ErrConfigNotInitialized
	}
	var cfg config.Config
	if _, err := toml.DecodeFile(path, &cfg); err != nil {
		return config.Config{}, err
	}
	if cfg.SystemPromptFile == "" {
		cfg.SystemPromptFile = config.DefaultSystemPromptFile
	}
	expandLocalSourcePaths(&cfg, dir)
	return cfg, nil
}

func expandLocalSourcePaths(cfg *config.Config, configDir string) {
	for name, entry := range cfg.Skills {
		if !skill.IsGitSource(entry.Source) && !filepath.IsAbs(entry.Source) {
			entry.Source = filepath.Join(configDir, entry.Source)
			cfg.Skills[name] = entry
		}
	}
	for name, entry := range cfg.Subagents {
		if !skill.IsGitSource(entry.Source) && !filepath.IsAbs(entry.Source) {
			entry.Source = filepath.Join(configDir, entry.Source)
			cfg.Subagents[name] = entry
		}
	}
}

func WriteConfig(cfg config.Config) error {
	dir, err := ConfigDirectoryPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	var buf bytes.Buffer
	if err := toml.NewEncoder(&buf).Encode(cfg); err != nil {
		return err
	}
	path := filepath.Join(dir, configFileName)
	return os.WriteFile(path, buf.Bytes(), 0o644)
}
