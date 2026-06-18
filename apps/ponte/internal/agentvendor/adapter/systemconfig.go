package adapter

import (
	"os"
	"path/filepath"
	"runtime"

	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
)

const (
	skillsDir = "skills"
	agentsDir = "agents"

	claudePackageName      = "claude"
	codexPackageName       = "codex"
	geminiPackageName      = "gemini"
	cursorPackageName      = "cursor"
	cursorAgentPackageName = "cursor-agent"

	claudeInstructionFile = "CLAUDE.md"
	codexInstructionFile  = "instructions.md"
	geminiInstructionFile = "GEMINI.md"
	cursorRulesDir        = "rules"
	cursorInstructionFile = "global.mdc"
)

func GetConfiguration(name agentvendor.AgentVendorName) (agentvendor.AgentVendorConfiguration, error) {
	configs, err := platformConfigurations()
	if err != nil {
		return agentvendor.AgentVendorConfiguration{}, err
	}
	cfg, ok := configs[name]
	if !ok {
		return agentvendor.AgentVendorConfiguration{}, &agentvendor.VendorConfigurationNotFoundError{Name: name}
	}
	return cfg, nil
}

func platformConfigurations() (map[agentvendor.AgentVendorName]agentvendor.AgentVendorConfiguration, error) {
	switch runtime.GOOS {
	case "linux", "darwin":
		return posixConfigurations(), nil
	case "windows":
		return windowsConfigurations(), nil
	default:
		return nil, &agentvendor.UnsupportedPlatformError{Platform: runtime.GOOS}
	}
}

func posixConfigurations() map[agentvendor.AgentVendorName]agentvendor.AgentVendorConfiguration {
	home, _ := os.UserHomeDir()
	claudeRoot := filepath.Join(home, ".claude")
	codexRoot := filepath.Join(home, ".codex")
	geminiRoot := filepath.Join(home, ".gemini")
	cursorRoot := filepath.Join(home, ".cursor")
	return map[agentvendor.AgentVendorName]agentvendor.AgentVendorConfiguration{
		agentvendor.ClaudeCode: {
			VendorName:                agentvendor.ClaudeCode,
			PackageName:               claudePackageName,
			GlobalInstructionFilePath: filepath.Join(claudeRoot, claudeInstructionFile),
			SkillsDirectoryPath:       filepath.Join(claudeRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(claudeRoot, agentsDir),
		},
		agentvendor.Codex: {
			VendorName:                agentvendor.Codex,
			PackageName:               codexPackageName,
			GlobalInstructionFilePath: filepath.Join(codexRoot, codexInstructionFile),
			SkillsDirectoryPath:       filepath.Join(codexRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(codexRoot, agentsDir),
		},
		agentvendor.GeminiCLI: {
			VendorName:                agentvendor.GeminiCLI,
			PackageName:               geminiPackageName,
			GlobalInstructionFilePath: filepath.Join(geminiRoot, geminiInstructionFile),
			SkillsDirectoryPath:       filepath.Join(geminiRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(geminiRoot, agentsDir),
		},
		agentvendor.CursorAgent: {
			VendorName:                agentvendor.CursorAgent,
			PackageName:               cursorPackageName,
			GlobalInstructionFilePath: filepath.Join(cursorRoot, cursorRulesDir, cursorInstructionFile),
			SkillsDirectoryPath:       filepath.Join(cursorRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(cursorRoot, agentsDir),
		},
	}
}

func windowsConfigurations() map[agentvendor.AgentVendorName]agentvendor.AgentVendorConfiguration {
	home, _ := os.UserHomeDir()
	roaming := filepath.Join(home, "AppData", "Roaming")
	claudeRoot := filepath.Join(roaming, "Claude")
	codexRoot := filepath.Join(roaming, "Codex")
	geminiRoot := filepath.Join(roaming, "Gemini")
	cursorRoot := filepath.Join(roaming, "Cursor")
	return map[agentvendor.AgentVendorName]agentvendor.AgentVendorConfiguration{
		agentvendor.ClaudeCode: {
			VendorName:                agentvendor.ClaudeCode,
			PackageName:               claudePackageName,
			GlobalInstructionFilePath: filepath.Join(claudeRoot, claudeInstructionFile),
			SkillsDirectoryPath:       filepath.Join(claudeRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(claudeRoot, agentsDir),
		},
		agentvendor.Codex: {
			VendorName:                agentvendor.Codex,
			PackageName:               codexPackageName,
			GlobalInstructionFilePath: filepath.Join(codexRoot, codexInstructionFile),
			SkillsDirectoryPath:       filepath.Join(codexRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(codexRoot, agentsDir),
		},
		agentvendor.GeminiCLI: {
			VendorName:                agentvendor.GeminiCLI,
			PackageName:               geminiPackageName,
			GlobalInstructionFilePath: filepath.Join(geminiRoot, geminiInstructionFile),
			SkillsDirectoryPath:       filepath.Join(geminiRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(geminiRoot, agentsDir),
		},
		agentvendor.CursorAgent: {
			VendorName:                agentvendor.CursorAgent,
			PackageName:               cursorAgentPackageName,
			GlobalInstructionFilePath: filepath.Join(cursorRoot, cursorRulesDir, cursorInstructionFile),
			SkillsDirectoryPath:       filepath.Join(cursorRoot, skillsDir),
			SubagentsDirectoryPath:    filepath.Join(cursorRoot, agentsDir),
		},
	}
}
