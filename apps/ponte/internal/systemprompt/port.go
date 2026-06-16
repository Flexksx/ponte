package systemprompt

type (
	Reader func() (SystemPrompt, error)
	Writer func(SystemPrompt) error
)
