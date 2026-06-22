package cli

import (
	"github.com/spf13/cobra"

	configadapter "github.com/flexksx/ponte/apps/ponte/internal/config/adapter"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
)

func newSkillsCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "skills",
		Short: "List the skills declared in config.toml",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			cfg, err := configadapter.ReadConfig()
			if err != nil {
				return err
			}
			entries := make([]configEntry, 0, len(cfg.Skills))
			for name, skillEntry := range cfg.Skills {
				entries = append(entries, configEntry{name: name, source: skill.ParseSource(skillEntry.Source, skillEntry.Ref, skillEntry.Subdir)})
			}
			printConfigEntries(cmd, "skills", entries)
			return nil
		},
	}
}
