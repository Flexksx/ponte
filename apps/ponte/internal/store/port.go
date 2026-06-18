package store

type GenerationBuilder func(input BuildInput) (Generation, error)

// VendorActivator symlinks the generation's instruction file, skills, and
// subagents into the vendor-specific directory layout.
type VendorActivator func(gen Generation, instructionFilePath, skillsDirPath, subagentsDirPath string) error
