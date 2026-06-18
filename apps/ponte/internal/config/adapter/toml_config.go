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
	for i := range cfg.Skills {
		expandLocalSource(&cfg.Skills[i].Source, configDir)
	}
	for i := range cfg.Subagents {
		expandLocalSource(&cfg.Subagents[i].Source, configDir)
	}
}

func expandLocalSource(source *skill.SkillSource, configDir string) {
	if source.Type == skill.LocalSourceType && !filepath.IsAbs(source.LocalPath) {
		source.LocalPath = filepath.Join(configDir, source.LocalPath)
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
