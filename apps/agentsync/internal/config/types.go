package config

import "github.com/flexksx/agentsync/apps/agentsync/internal/agentvendor"

type AgentEntry struct {
	Enabled bool `toml:"enabled"`
}

const DefaultSystemPromptFile = "AGENTS.md"

type Config struct {
	SystemPromptFile string                                     `toml:"system_prompt_file"`
	Agents           map[agentvendor.AgentVendorName]AgentEntry `toml:"agents"`
}

func DefaultConfig() Config {
	return Config{
		SystemPromptFile: DefaultSystemPromptFile,
		Agents: map[agentvendor.AgentVendorName]AgentEntry{
			agentvendor.ClaudeCode:  {Enabled: true},
			agentvendor.Codex:       {Enabled: true},
			agentvendor.GeminiCLI:   {Enabled: true},
			agentvendor.CursorAgent: {Enabled: true},
		},
	}
}
