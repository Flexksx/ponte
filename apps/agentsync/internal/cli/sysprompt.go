package cli

import (
	"fmt"

	"github.com/spf13/cobra"

	configadapter "github.com/flexksx/agentsync/apps/agentsync/internal/config/adapter"
	"github.com/flexksx/agentsync/apps/agentsync/internal/sysprompt"
	"github.com/flexksx/agentsync/apps/agentsync/internal/systemprompt"
	promptadapter "github.com/flexksx/agentsync/apps/agentsync/internal/systemprompt/adapter"
)

func newSyspromptCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sysprompt",
		Short: "Manage the global system prompt",
	}
	cmd.AddCommand(newSyspromptSetCommand())
	return cmd
}

func newSyspromptSetCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "set <file-or-string>",
		Short: "Persistently set the global system prompt",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			content, err := resolveContent(args[0])
			if err != nil {
				return fmt.Errorf("reading system prompt: %w", err)
			}

			cfg, err := configadapter.ReadConfig()
			if err != nil {
				return err
			}

			useCase := &sysprompt.SetUseCase{
				WriteSystemPrompt: func(prompt systemprompt.SystemPrompt) error {
					return promptadapter.WriteSystemPromptToFile(cfg.SystemPromptFile, prompt)
				},
			}

			if err := useCase.Execute(sysprompt.SetRequest{Content: content}); err != nil {
				return err
			}

			cmd.Println("System prompt updated.")
			return nil
		},
	}
}
