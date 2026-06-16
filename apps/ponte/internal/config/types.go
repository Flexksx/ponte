package config

import (
	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
)

type AgentEntry struct {
	Enabled bool `toml:"enabled"`
}

type SkillEntry struct {
	Name   string           `toml:"name"`
	Source skill.SkillSource `toml:"source"`
}

const DefaultSystemPromptFile = "AGENTS.md"

type Config struct {
	SystemPromptFile string                                     `toml:"system_prompt_file"`
	Agents           map[agentvendor.AgentVendorName]AgentEntry `toml:"agents"`
	Skills           []SkillEntry                               `toml:"skills"`
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
