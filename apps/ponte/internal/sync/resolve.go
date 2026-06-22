package sync

import (
	"fmt"

	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
	"github.com/flexksx/ponte/apps/ponte/internal/config"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
	"github.com/flexksx/ponte/apps/ponte/internal/store"
	"github.com/flexksx/ponte/apps/ponte/internal/systemprompt"
)

// ResolveBuildInput turns a system prompt plus the declared skill and subagent
// sources into the store.BuildInput a generation is built from. Both the sync
// use case and the status preview share it so a previewed generation hash
// always matches what a real sync produces.
func ResolveBuildInput(
	prompt systemprompt.SystemPrompt,
	skills map[string]config.SkillEntry,
	subagents map[string]config.SubagentEntry,
	target agentvendor.AgentVendorName,
	resolveSkill skill.Resolver,
) (store.BuildInput, error) {
	resolvedSkills, err := resolveSkills(skills, target, resolveSkill)
	if err != nil {
		return store.BuildInput{}, err
	}
	resolvedSubagents, err := resolveSubagents(subagents, resolveSkill)
	if err != nil {
		return store.BuildInput{}, err
	}
	return store.BuildInput{
		SystemPromptContent: prompt.Content,
		Skills:              resolvedSkills,
		Subagents:           resolvedSubagents,
	}, nil
}

func resolveSkills(entries map[string]config.SkillEntry, target agentvendor.AgentVendorName, resolveSkill skill.Resolver) ([]store.ResolvedSkill, error) {
	resolved := make([]store.ResolvedSkill, 0, len(entries))
	for name, entry := range entries {
		if vendorCfg, ok := entry.Vendors[target]; ok && vendorCfg.Enabled != nil && !*vendorCfg.Enabled {
			continue
		}
		dir, err := resolveSkill(skillSourceFrom(entry))
		if err != nil {
			return nil, fmt.Errorf("resolving skill %q: %w", name, err)
		}
		resolved = append(resolved, store.ResolvedSkill{Name: name, SourceDir: dir})
	}
	return resolved, nil
}

func resolveSubagents(entries map[string]config.SubagentEntry, resolveSkill skill.Resolver) ([]store.ResolvedSubagent, error) {
	resolved := make([]store.ResolvedSubagent, 0, len(entries))
	for name, entry := range entries {
		dir, err := resolveSkill(subagentSourceFrom(entry))
		if err != nil {
			return nil, fmt.Errorf("resolving subagent %q: %w", name, err)
		}
		resolved = append(resolved, store.ResolvedSubagent{Name: name, SourceDir: dir})
	}
	return resolved, nil
}

func skillSourceFrom(entry config.SkillEntry) skill.SkillSource {
	return skill.ParseSource(entry.Source, entry.Ref, entry.Subdir)
}

func subagentSourceFrom(entry config.SubagentEntry) skill.SkillSource {
	return skill.ParseSource(entry.Source, entry.Ref, entry.Subdir)
}
