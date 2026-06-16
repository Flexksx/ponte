package cli

import (
	"errors"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/flexksx/ponte/apps/ponte/internal/agentvendor"
	vendoradapter "github.com/flexksx/ponte/apps/ponte/internal/agentvendor/adapter"
	"github.com/flexksx/ponte/apps/ponte/internal/config"
	configadapter "github.com/flexksx/ponte/apps/ponte/internal/config/adapter"
	skilladapter "github.com/flexksx/ponte/apps/ponte/internal/skill/adapter"
	storeadapter "github.com/flexksx/ponte/apps/ponte/internal/store/adapter"
	"github.com/flexksx/ponte/apps/ponte/internal/sync"
	"github.com/flexksx/ponte/apps/ponte/internal/systemprompt"
	promptadapter "github.com/flexksx/ponte/apps/ponte/internal/systemprompt/adapter"
)

func newSyncCommand() *cobra.Command {
	var globalInstructionsFlag string
	var agentsFlag []string

	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Sync the system prompt and skills to configured agent vendors",
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

			storeDir, err := storeadapter.StoreDirectoryPath()
			if err != nil {
				return fmt.Errorf("resolving store directory: %w", err)
			}

			gitCacheDir, err := skilladapter.GitCacheDirectoryPath()
			if err != nil {
				return fmt.Errorf("resolving skill cache directory: %w", err)
			}

			useCase := &sync.UseCase{
				ReadSystemPrompt: func() (systemprompt.SystemPrompt, error) {
					return promptadapter.ReadSystemPromptFromFile(cfg.SystemPromptFile)
				},
				ReadConfig:            configadapter.ReadConfig,
				GetAgentConfiguration: vendoradapter.GetConfiguration,
				ResolveSkill:          skilladapter.NewResolver(gitCacheDir),
				BuildGeneration:       storeadapter.NewBuilder(storeDir),
				ActivateForVendor:     storeadapter.Activate,
			}

			if err := useCase.Execute(sync.SyncRequest{
				SystemPromptOverride: promptOverride,
				TargetAgents:         targetAgents,
				Skills:               cfg.Skills,
			}); err != nil {
				return err
			}

			targets := agentsFlag
			if len(targets) == 0 {
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
	cmd.Printf("Initialized ponte config at %s\n", dir)
	cmd.Printf("  config.toml      — all agents enabled, no skills\n")
	cmd.Printf("  %s — empty\n\n", config.DefaultSystemPromptFile)
	return nil
}
