package sync

import (
	"errors"
	"testing"

	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
	"github.com/flexksx/ponte/apps/ponte/internal/config"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
	"github.com/flexksx/ponte/apps/ponte/internal/store"
	"github.com/flexksx/ponte/apps/ponte/internal/systemprompt"
)

func workingUseCase() UseCase {
	return UseCase{
		ReadSystemPrompt: func() (systemprompt.SystemPrompt, error) {
			return systemprompt.SystemPrompt{Content: "default"}, nil
		},
		ReadConfig: func() (config.Config, error) {
			return config.Config{
				Agents: map[agentvendor.AgentVendorName]config.AgentEntry{
					agentvendor.ClaudeCode: {Enabled: true},
				},
			}, nil
		},
		GetAgentConfiguration: func(name agentvendor.AgentVendorName) (agentvendor.AgentVendorConfiguration, error) {
			return agentvendor.AgentVendorConfiguration{
				VendorName:                name,
				GlobalInstructionFilePath: "/fake/" + string(name) + "/instruction",
				SkillsDirectoryPath:       "/fake/" + string(name) + "/skills",
			}, nil
		},
		ResolveSkill: func(source skill.SkillSource) (string, error) {
			return "/fake/skills/" + string(source.Type), nil
		},
		BuildGeneration: func(input store.BuildInput) (store.Generation, error) {
			return store.Generation{Hash: "testhash", RootPath: "/fake/store/testhash"}, nil
		},
		ActivateForVendor: func(_ store.Generation, _, _ string) error {
			return nil
		},
	}
}

func TestExecute_WithExplicitTargets_SkipsConfig(t *testing.T) {
	t.Parallel()
	useCase := workingUseCase()
	configCalled := false
	useCase.ReadConfig = func() (config.Config, error) {
		configCalled = true
		return config.Config{}, nil
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if configCalled {
		t.Error("ReadConfig must not be called when targets are explicit")
	}
}

func TestExecute_WithNoTargets_UsesEnabledAgentsFromConfig(t *testing.T) {
	t.Parallel()
	activatedVendors := map[string]bool{}
	useCase := workingUseCase()
	useCase.ReadConfig = func() (config.Config, error) {
		return config.Config{
			Agents: map[agentvendor.AgentVendorName]config.AgentEntry{
				agentvendor.ClaudeCode: {Enabled: true},
				agentvendor.Codex:      {Enabled: false},
				agentvendor.GeminiCLI:  {Enabled: true},
			},
		}, nil
	}
	useCase.ActivateForVendor = func(_ store.Generation, instructionPath, _ string) error {
		activatedVendors[instructionPath] = true
		return nil
	}

	err := useCase.Execute(SyncRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(activatedVendors) != 2 {
		t.Errorf("expected 2 activations, got %d: %v", len(activatedVendors), activatedVendors)
	}
	if !activatedVendors["/fake/claude-code/instruction"] {
		t.Error("expected activation for claude-code")
	}
	if !activatedVendors["/fake/gemini-cli/instruction"] {
		t.Error("expected activation for gemini-cli")
	}
	if activatedVendors["/fake/codex/instruction"] {
		t.Error("must not activate disabled agent codex")
	}
}

func TestExecute_WithNoTargets_NoEnabledAgents_ReturnsErrNoAgentsConfigured(t *testing.T) {
	t.Parallel()
	useCase := workingUseCase()
	useCase.ReadConfig = func() (config.Config, error) {
		return config.Config{
			Agents: map[agentvendor.AgentVendorName]config.AgentEntry{
				agentvendor.ClaudeCode: {Enabled: false},
			},
		}, nil
	}

	err := useCase.Execute(SyncRequest{})

	var target ErrNoAgentsConfigured
	if !errors.As(err, &target) {
		t.Errorf("expected ErrNoAgentsConfigured, got %T: %v", err, err)
	}
}

func TestExecute_WithPromptOverride_WritesOverrideAndSkipsStore(t *testing.T) {
	t.Parallel()
	useCase := workingUseCase()
	storeCalled := false
	useCase.ReadSystemPrompt = func() (systemprompt.SystemPrompt, error) {
		storeCalled = true
		return systemprompt.SystemPrompt{Content: "stored"}, nil
	}
	var builtWith store.BuildInput
	useCase.BuildGeneration = func(input store.BuildInput) (store.Generation, error) {
		builtWith = input
		return store.Generation{Hash: "h", RootPath: "/fake/store/h"}, nil
	}
	override := systemprompt.SystemPrompt{Content: "override"}

	err := useCase.Execute(SyncRequest{
		TargetAgents:         []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
		SystemPromptOverride: &override,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if storeCalled {
		t.Error("ReadSystemPrompt must not be called when override is provided")
	}
	if builtWith.SystemPromptContent != "override" {
		t.Errorf("expected override content in build input, got %q", builtWith.SystemPromptContent)
	}
}

func TestExecute_WithoutPromptOverride_UsesStoredPrompt(t *testing.T) {
	t.Parallel()
	useCase := workingUseCase()
	useCase.ReadSystemPrompt = func() (systemprompt.SystemPrompt, error) {
		return systemprompt.SystemPrompt{Content: "stored"}, nil
	}
	var builtWith store.BuildInput
	useCase.BuildGeneration = func(input store.BuildInput) (store.Generation, error) {
		builtWith = input
		return store.Generation{Hash: "h", RootPath: "/fake/store/h"}, nil
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if builtWith.SystemPromptContent != "stored" {
		t.Errorf("expected stored content in build input, got %q", builtWith.SystemPromptContent)
	}
}

func TestExecute_WhenAgentConfigurationFails_ReturnsErrUnknownAgent(t *testing.T) {
	t.Parallel()
	useCase := workingUseCase()
	useCase.GetAgentConfiguration = func(_ agentvendor.AgentVendorName) (agentvendor.AgentVendorConfiguration, error) {
		return agentvendor.AgentVendorConfiguration{}, errors.New("not found")
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
	})

	var target ErrUnknownAgent
	if !errors.As(err, &target) {
		t.Errorf("expected ErrUnknownAgent, got %T: %v", err, err)
	}
	if target.Name != agentvendor.ClaudeCode {
		t.Errorf("expected agent name %q, got %q", agentvendor.ClaudeCode, target.Name)
	}
}

func TestExecute_WhenActivationFails_PropagatesError(t *testing.T) {
	t.Parallel()
	activateErr := errors.New("symlink failed")
	useCase := workingUseCase()
	useCase.ActivateForVendor = func(_ store.Generation, _, _ string) error {
		return activateErr
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
	})

	if !errors.Is(err, activateErr) {
		t.Errorf("expected activation error to be propagated, got %v", err)
	}
}

func TestExecute_WhenBuildGenerationFails_PropagatesError(t *testing.T) {
	t.Parallel()
	buildErr := errors.New("disk full")
	useCase := workingUseCase()
	useCase.BuildGeneration = func(_ store.BuildInput) (store.Generation, error) {
		return store.Generation{}, buildErr
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
	})

	if !errors.Is(err, buildErr) {
		t.Errorf("expected build error to be propagated, got %v", err)
	}
}

func TestExecute_WhenConfigReadFails_PropagatesError(t *testing.T) {
	t.Parallel()
	configErr := errors.New("config read failed")
	useCase := workingUseCase()
	useCase.ReadConfig = func() (config.Config, error) {
		return config.Config{}, configErr
	}

	err := useCase.Execute(SyncRequest{})

	if !errors.Is(err, configErr) {
		t.Errorf("expected config error to be propagated, got %v", err)
	}
}

func TestExecute_WhenSystemPromptReadFails_PropagatesError(t *testing.T) {
	t.Parallel()
	promptErr := errors.New("prompt read failed")
	useCase := workingUseCase()
	useCase.ReadSystemPrompt = func() (systemprompt.SystemPrompt, error) {
		return systemprompt.SystemPrompt{}, promptErr
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
	})

	if !errors.Is(err, promptErr) {
		t.Errorf("expected prompt error to be propagated, got %v", err)
	}
}

func TestExecute_WithMultipleTargets_ActivatesEachVendor(t *testing.T) {
	t.Parallel()
	var activatedPaths []string
	useCase := workingUseCase()
	useCase.ActivateForVendor = func(_ store.Generation, instructionPath, _ string) error {
		activatedPaths = append(activatedPaths, instructionPath)
		return nil
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode, agentvendor.GeminiCLI},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(activatedPaths) != 2 {
		t.Errorf("expected 2 activations, got %d: %v", len(activatedPaths), activatedPaths)
	}
}

func TestExecute_WithSkills_ResolvesAndBuildsWithSkills(t *testing.T) {
	t.Parallel()
	useCase := workingUseCase()
	var resolvedSources []skill.SkillSource
	useCase.ResolveSkill = func(source skill.SkillSource) (string, error) {
		resolvedSources = append(resolvedSources, source)
		return "/resolved/" + string(source.Type), nil
	}
	var builtWith store.BuildInput
	useCase.BuildGeneration = func(input store.BuildInput) (store.Generation, error) {
		builtWith = input
		return store.Generation{Hash: "h", RootPath: "/fake/store/h"}, nil
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
		Skills: []config.SkillEntry{
			{Name: "my-skill", Source: skill.SkillSource{Type: skill.LocalSourceType, LocalPath: "/src/my-skill"}},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resolvedSources) != 1 {
		t.Errorf("expected 1 skill resolved, got %d", len(resolvedSources))
	}
	if len(builtWith.Skills) != 1 || builtWith.Skills[0].Name != "my-skill" {
		t.Errorf("expected skill in build input, got %v", builtWith.Skills)
	}
	if builtWith.Skills[0].SourceDir != "/resolved/local" {
		t.Errorf("expected resolved source dir, got %q", builtWith.Skills[0].SourceDir)
	}
}

func TestExecute_WhenSkillResolutionFails_PropagatesError(t *testing.T) {
	t.Parallel()
	resolveErr := errors.New("skill not found")
	useCase := workingUseCase()
	useCase.ResolveSkill = func(_ skill.SkillSource) (string, error) {
		return "", resolveErr
	}

	err := useCase.Execute(SyncRequest{
		TargetAgents: []agentvendor.AgentVendorName{agentvendor.ClaudeCode},
		Skills: []config.SkillEntry{
			{Name: "bad-skill", Source: skill.SkillSource{Type: skill.LocalSourceType, LocalPath: "/missing"}},
		},
	})

	if !errors.Is(err, resolveErr) {
		t.Errorf("expected skill resolution error to be propagated, got %v", err)
	}
}
