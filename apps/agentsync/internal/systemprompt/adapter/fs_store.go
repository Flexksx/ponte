package adapter

import (
	"errors"
	"os"
	"path/filepath"

	"github.com/flexksx/agentsync/apps/agentsync/internal/systemprompt"
)

const systemPromptFileName = "system_prompt.md"

func systemPromptPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "agentsync", systemPromptFileName), nil
}

func ReadSystemPrompt() (systemprompt.SystemPrompt, error) {
	path, err := systemPromptPath()
	if err != nil {
		return systemprompt.SystemPrompt{}, err
	}
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return systemprompt.SystemPrompt{}, systemprompt.ErrNoSystemPrompt
	}
	content, err := os.ReadFile(path)
	if err != nil {
		return systemprompt.SystemPrompt{}, err
	}
	return systemprompt.SystemPrompt{Content: string(content)}, nil
}

func WriteSystemPrompt(prompt systemprompt.SystemPrompt) error {
	path, err := systemPromptPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(prompt.Content), 0o644)
}
