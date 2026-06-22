// Package status reports the active generation per vendor and whether the
// declared sources have drifted from what is currently activated.
package status

import (
	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
	"github.com/flexksx/ponte/apps/ponte/internal/config"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
	"github.com/flexksx/ponte/apps/ponte/internal/store"
	"github.com/flexksx/ponte/apps/ponte/internal/sync"
	"github.com/flexksx/ponte/apps/ponte/internal/systemprompt"
)

type UseCase struct {
	KnownVendors          []agentvendor.AgentVendorName
	ReadConfig            config.ConfigReader
	ReadSystemPrompt      systemprompt.Reader
	GetAgentConfiguration agentvendor.ConfigurationPort
	ResolveSkill          skill.Resolver
	ComputeHash           store.HashComputer
	ReadActiveHash        store.ActiveHashReader
}

// Execute resolves the declared sources to the generation a sync would build
// (WouldBeHash), then reads each vendor's currently activated generation so the
// presentation layer can flag drift.
func (u *UseCase) Execute() (Report, error) {
	cfg, err := u.ReadConfig()
	if err != nil {
		return Report{}, err
	}

	prompt, err := u.ReadSystemPrompt()
	if err != nil {
		return Report{}, err
	}

	report := Report{}
	for _, name := range u.KnownVendors {
		input, err := sync.ResolveBuildInput(prompt, cfg.Skills, cfg.Subagents, name, u.ResolveSkill)
		if err != nil {
			return Report{}, err
		}
		wouldBeHash, err := u.ComputeHash(input)
		if err != nil {
			return Report{}, err
		}
		if report.WouldBeHash == "" {
			report.WouldBeHash = wouldBeHash
		}

		vendorConfig, err := u.GetAgentConfiguration(name)
		if err != nil {
			return Report{}, err
		}
		activeHash, hasActive, err := u.ReadActiveHash(vendorConfig.GlobalInstructionFilePath)
		if err != nil {
			return Report{}, err
		}
		report.Vendors = append(report.Vendors, VendorStatus{
			Name:       name,
			Enabled:    cfg.Vendors[name].Enabled,
			ActiveHash: activeHash,
			HasActive:  hasActive,
		})
	}
	return report, nil
}
