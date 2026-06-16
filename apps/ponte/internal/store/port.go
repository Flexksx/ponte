package store

type GenerationBuilder func(input BuildInput) (Generation, error)

// VendorActivator symlinks the generation's instruction file and skills into
// the vendor-specific directory layout.
type VendorActivator func(gen Generation, instructionFilePath string, skillsDirPath string) error
