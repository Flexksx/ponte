package config

import (
	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
)

type VendorSkillConfig struct {
	Enabled *bool `toml:"enabled"`
}

type SkillEntry struct {
	Source  string                                            `toml:"source"`
	Ref     string                                           `toml:"ref,omitempty"`
	Subdir  string                                           `toml:"subdir,omitempty"`
	Vendors map[agentvendor.AgentVendorName]VendorSkillConfig `toml:"vendors,omitempty"`
}

type SubagentEntry struct {
	Source string `toml:"source"`
	Ref    string `toml:"ref,omitempty"`
	Subdir string `toml:"subdir,omitempty"`
}

type AgentEntry struct {
	Enabled bool `toml:"enabled"`
}

const DefaultSystemPromptFile = "AGENTS.md"

type Config struct {
	SystemPromptFile string                                     `toml:"system_prompt_file"`
	Vendors          map[agentvendor.AgentVendorName]AgentEntry `toml:"vendors"`
	Skills           map[string]SkillEntry                      `toml:"skills"`
	Subagents        map[string]SubagentEntry                   `toml:"subagents"`
}

func DefaultConfig() Config {
	return Config{
		SystemPromptFile: DefaultSystemPromptFile,
		Vendors: map[agentvendor.AgentVendorName]AgentEntry{
			agentvendor.ClaudeCode:  {Enabled: true},
			agentvendor.Codex:       {Enabled: true},
			agentvendor.GeminiCLI:   {Enabled: true},
			agentvendor.CursorAgent: {Enabled: true},
		},
	}
}
