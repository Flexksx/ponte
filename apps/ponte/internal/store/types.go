package store

type Generation struct {
	Hash     string
	RootPath string
}

type ResolvedSkill struct {
	Name      string
	SourceDir string
}

type ResolvedSubagent struct {
	Name      string
	SourceDir string
}

type BuildInput struct {
	SystemPromptContent string
	Skills              []ResolvedSkill
	Subagents           []ResolvedSubagent
}
