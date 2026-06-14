package systemprompt

import "errors"

var ErrNoSystemPrompt = errors.New("no system prompt configured — create ~/.config/agentsync/system_prompt.md or use -g")

type SystemPrompt struct {
	Content string
}
