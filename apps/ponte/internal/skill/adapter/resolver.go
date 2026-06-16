package adapter

import (
	"fmt"

	"github.com/flexksx/ponte/apps/ponte/internal/skill"
)

func NewResolver(gitCacheDir string) skill.Resolver {
	return func(source skill.SkillSource) (string, error) {
		switch source.Type {
		case skill.LocalSourceType:
			return resolveLocal(source)
		case skill.GitSourceType:
			return resolveGit(gitCacheDir, source)
		default:
			return "", fmt.Errorf("unknown skill source type: %q", source.Type)
		}
	}
}

func resolveLocal(source skill.SkillSource) (string, error) {
	info, err := statDir(source.LocalPath)
	if err != nil {
		return "", fmt.Errorf("skill directory not found at %s: %w", source.LocalPath, err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("skill source path is not a directory: %s", source.LocalPath)
	}
	return source.LocalPath, nil
}
