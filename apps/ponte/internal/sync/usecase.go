package sync

import (
	"fmt"

	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
	"github.com/flexksx/ponte/apps/ponte/internal/config"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
	"github.com/flexksx/ponte/apps/ponte/internal/store"
	"github.com/flexksx/ponte/apps/ponte/internal/systemprompt"
)

type UseCase struct {
	ReadSystemPrompt      systemprompt.Reader
	ReadConfig            config.ConfigReader
	GetAgentConfiguration agentvendor.ConfigurationPort
	ResolveSkill          skill.Resolver
	BuildGeneration       store.GenerationBuilder
	ActivateForVendor     store.VendorActivator
}

func (u *UseCase) Execute(request SyncRequest) error {
	targets, err := u.resolveTargets(request.TargetAgents)
	if err != nil {
		return err
	}

	prompt, err := u.resolveSystemPrompt(request.SystemPromptOverride)
	if err != nil {
		return err
	}

	resolvedSkills, err := u.resolveSkills(request.Skills)
	if err != nil {
		return err
	}

	resolvedSubagents, err := u.resolveSubagents(request.Subagents)
	if err != nil {
		return err
	}

	generation, err := u.BuildGeneration(store.BuildInput{
		SystemPromptContent: prompt.Content,
		Skills:              resolvedSkills,
		Subagents:           resolvedSubagents,
	})
	if err != nil {
		return err
	}

	for _, target := range targets {
		vendorConfig, err := u.GetAgentConfiguration(target)
		if err != nil {
			return ErrUnknownAgent{Name: target}
		}
		if err := u.ActivateForVendor(generation, vendorConfig.GlobalInstructionFilePath, vendorConfig.SkillsDirectoryPath, vendorConfig.SubagentsDirectoryPath); err != nil {
			return err
		}
	}
	return nil
}

func (u *UseCase) resolveTargets(requested []agentvendor.AgentVendorName) ([]agentvendor.AgentVendorName, error) {
	if len(requested) > 0 {
		return requested, nil
	}
	cfg, err := u.ReadConfig()
	if err != nil {
		return nil, err
	}
	var enabled []agentvendor.AgentVendorName
	for name, entry := range cfg.Agents {
		if entry.Enabled {
			enabled = append(enabled, name)
		}
	}
	if len(enabled) == 0 {
		return nil, ErrNoAgentsConfigured{}
	}
	return enabled, nil
}

func (u *UseCase) resolveSystemPrompt(override *systemprompt.SystemPrompt) (systemprompt.SystemPrompt, error) {
	if override != nil {
		return *override, nil
	}
	return u.ReadSystemPrompt()
}

func (u *UseCase) resolveSkills(entries []config.SkillEntry) ([]store.ResolvedSkill, error) {
	resolved := make([]store.ResolvedSkill, 0, len(entries))
	for _, entry := range entries {
		dir, err := u.ResolveSkill(entry.Source)
		if err != nil {
			return nil, fmt.Errorf("resolving skill %q: %w", entry.Name, err)
		}
		resolved = append(resolved, store.ResolvedSkill{Name: entry.Name, SourceDir: dir})
	}
	return resolved, nil
}

func (u *UseCase) resolveSubagents(entries []config.SubagentEntry) ([]store.ResolvedSubagent, error) {
	resolved := make([]store.ResolvedSubagent, 0, len(entries))
	for _, entry := range entries {
		dir, err := u.ResolveSkill(entry.Source)
		if err != nil {
			return nil, fmt.Errorf("resolving subagent %q: %w", entry.Name, err)
		}
		resolved = append(resolved, store.ResolvedSubagent{Name: entry.Name, SourceDir: dir})
	}
	return resolved, nil
}
