package status

import (
	"errors"
	"testing"

	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
	"github.com/flexksx/ponte/apps/ponte/internal/config"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
	"github.com/flexksx/ponte/apps/ponte/internal/store"
	"github.com/flexksx/ponte/apps/ponte/internal/systemprompt"
)

func instructionPath(name agentvendor.AgentVendorName) string {
	return "/fake/" + string(name) + "/instruction"
}

func workingUseCase(active map[string]string, enabled map[agentvendor.AgentVendorName]bool) UseCase {
	vendors := map[agentvendor.AgentVendorName]config.AgentEntry{}
	for name, on := range enabled {
		vendors[name] = config.AgentEntry{Enabled: on}
	}
	return UseCase{
		KnownVendors: agentvendor.AllVendorNames(),
		ReadConfig: func() (config.Config, error) {
			return config.Config{Vendors: vendors}, nil
		},
		ReadSystemPrompt: func() (systemprompt.SystemPrompt, error) {
			return systemprompt.SystemPrompt{Content: "prompt"}, nil
		},
		GetAgentConfiguration: func(name agentvendor.AgentVendorName) (agentvendor.AgentVendorConfiguration, error) {
			return agentvendor.AgentVendorConfiguration{
				VendorName:                name,
				GlobalInstructionFilePath: instructionPath(name),
			}, nil
		},
		ResolveSkill: func(_ skill.SkillSource) (string, error) {
			return "/resolved", nil
		},
		ComputeHash: func(_ store.BuildInput) (string, error) {
			return "wouldbe", nil
		},
		ReadActiveHash: func(instructionFilePath string) (string, bool, error) {
			hash, ok := active[instructionFilePath]
			return hash, ok, nil
		},
	}
}

func findVendor(report Report, name agentvendor.AgentVendorName) VendorStatus {
	for _, vendor := range report.Vendors {
		if vendor.Name == name {
			return vendor
		}
	}
	return VendorStatus{}
}

func TestExecute_ReportsWouldBeHashAndPerVendorState(t *testing.T) {
	t.Parallel()
	active := map[string]string{
		instructionPath(agentvendor.ClaudeCode): "wouldbe", // in sync
		instructionPath(agentvendor.Codex):      "oldhash", // drifted
		// gemini-cli: no entry → not synced
	}
	enabled := map[agentvendor.AgentVendorName]bool{
		agentvendor.ClaudeCode:  true,
		agentvendor.Codex:       true,
		agentvendor.GeminiCLI:   true,
		agentvendor.CursorAgent: false,
	}

	useCase := workingUseCase(active, enabled)
	report, err := useCase.Execute()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if report.WouldBeHash != "wouldbe" {
		t.Errorf("expected would-be hash 'wouldbe', got %q", report.WouldBeHash)
	}

	claude := findVendor(report, agentvendor.ClaudeCode)
	if !claude.InSync(report.WouldBeHash) {
		t.Errorf("expected claude-code in sync, got %+v", claude)
	}

	codex := findVendor(report, agentvendor.Codex)
	if codex.InSync(report.WouldBeHash) || !codex.HasActive {
		t.Errorf("expected codex drifted (active but not matching), got %+v", codex)
	}

	gemini := findVendor(report, agentvendor.GeminiCLI)
	if gemini.HasActive {
		t.Errorf("expected gemini-cli not synced, got %+v", gemini)
	}

	cursor := findVendor(report, agentvendor.CursorAgent)
	if cursor.Enabled {
		t.Errorf("expected cursor-agent disabled, got %+v", cursor)
	}
}

func TestExecute_WhenSkillResolutionFails_PropagatesError(t *testing.T) {
	t.Parallel()
	resolveErr := errors.New("skill not found")
	useCase := workingUseCase(map[string]string{}, map[agentvendor.AgentVendorName]bool{agentvendor.ClaudeCode: true})
	useCase.ReadConfig = func() (config.Config, error) {
		return config.Config{
			Vendors: map[agentvendor.AgentVendorName]config.AgentEntry{agentvendor.ClaudeCode: {Enabled: true}},
			Skills:  map[string]config.SkillEntry{"bad": {Source: "/bad"}},
		}, nil
	}
	useCase.ResolveSkill = func(_ skill.SkillSource) (string, error) {
		return "", resolveErr
	}

	_, err := useCase.Execute()
	if !errors.Is(err, resolveErr) {
		t.Errorf("expected skill resolution error to be propagated, got %v", err)
	}
}
