package adapter

import (
	"errors"
	"os"
	"path/filepath"

	"github.com/flexksx/agentsync/apps/agentsync/internal/systemprompt"
)

func systemPromptPath(filename string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "agentsync", filename), nil
}

func ReadSystemPromptFromFile(filename string) (systemprompt.SystemPrompt, error) {
	path, err := systemPromptPath(filename)
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

func WriteSystemPromptToFile(filename string, prompt systemprompt.SystemPrompt) error {
	path, err := systemPromptPath(filename)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(prompt.Content), 0o644)
}
