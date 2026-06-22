package cli

import (
	"github.com/spf13/cobra"

	configadapter "github.com/flexksx/ponte/apps/ponte/internal/config/adapter"
	"github.com/flexksx/ponte/apps/ponte/internal/skill"
)

func newSubagentsCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "subagents",
		Short: "List the subagents declared in config.toml",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			cfg, err := configadapter.ReadConfig()
			if err != nil {
				return err
			}
			entries := make([]configEntry, 0, len(cfg.Subagents))
			for name, subagentEntry := range cfg.Subagents {
				entries = append(entries, configEntry{name: name, source: skill.ParseSource(subagentEntry.Source, subagentEntry.Ref, subagentEntry.Subdir)})
			}
			printConfigEntries(cmd, "subagents", entries)
			return nil
		},
	}
}
