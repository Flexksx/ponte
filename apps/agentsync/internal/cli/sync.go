package cli

import (
	"errors"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/flexksx/agentsync/apps/agentsync/internal/agentvendor"
	vendoradapter "github.com/flexksx/agentsync/apps/agentsync/internal/agentvendor/adapter"
	"github.com/flexksx/agentsync/apps/agentsync/internal/config"
	configadapter "github.com/flexksx/agentsync/apps/agentsync/internal/config/adapter"
	"github.com/flexksx/agentsync/apps/agentsync/internal/sync"
	"github.com/flexksx/agentsync/apps/agentsync/internal/systemprompt"
	promptadapter "github.com/flexksx/agentsync/apps/agentsync/internal/systemprompt/adapter"
)

func newSyncCommand() *cobra.Command {
	var globalInstructionsFlag string
	var agentsFlag []string

	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Sync the system prompt to configured agent vendors",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := ensureConfigInitialized(cmd); err != nil {
				return err
			}

			cfg, err := configadapter.ReadConfig()
			if err != nil {
				return err
			}

			var promptOverride *systemprompt.SystemPrompt
			if globalInstructionsFlag != "" {
				content, err := resolveContent(globalInstructionsFlag)
				if err != nil {
					return fmt.Errorf("reading system prompt: %w", err)
				}
				promptOverride = &systemprompt.SystemPrompt{Content: content}
			}

			var targetAgents []agentvendor.AgentVendorName
			for _, name := range agentsFlag {
				targetAgents = append(targetAgents, agentvendor.AgentVendorName(name))
			}

			useCase := &sync.UseCase{
				ReadSystemPrompt: func() (systemprompt.SystemPrompt, error) {
					return promptadapter.ReadSystemPromptFromFile(cfg.SystemPromptFile)
				},
				ReadConfig:            configadapter.ReadConfig,
				GetAgentConfiguration: vendoradapter.GetConfiguration,
				WriteToAgent:          promptadapter.WriteToAgent,
			}

			if err := useCase.Execute(sync.SyncRequest{
				SystemPromptOverride: promptOverride,
				TargetAgents:         targetAgents,
			}); err != nil {
				return err
			}

			targets := agentsFlag
			if len(targets) == 0 {
				cfg, _ := configadapter.ReadConfig()
				for name, entry := range cfg.Agents {
					if entry.Enabled {
						targets = append(targets, string(name))
					}
				}
			}
			cmd.Printf("Synced to: %v\n", targets)
			return nil
		},
	}

	cmd.Flags().StringVarP(&globalInstructionsFlag, "global-instructions", "g", "", "Override system prompt (file path or inline string)")
	cmd.Flags().StringSliceVarP(&agentsFlag, "agents", "a", nil, "Target agents (ad-hoc, comma-separated: claude-code,codex,...)")

	return cmd
}

func ensureConfigInitialized(cmd *cobra.Command) error {
	_, err := configadapter.ReadConfig()
	if !errors.Is(err, config.ErrConfigNotInitialized) {
		return err
	}

	if writeErr := configadapter.WriteConfig(config.DefaultConfig()); writeErr != nil {
		return writeErr
	}
	if writeErr := promptadapter.WriteSystemPromptToFile(config.DefaultSystemPromptFile, systemprompt.SystemPrompt{}); writeErr != nil {
		return writeErr
	}

	dir, _ := configadapter.ConfigDirectoryPath()
	cmd.Printf("Initialized agentsync config at %s\n", dir)
	cmd.Printf("  config.toml      — all agents enabled\n")
	cmd.Printf("  %s — empty\n\n", config.DefaultSystemPromptFile)
	return nil
}
