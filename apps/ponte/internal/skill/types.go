package skill

import "strings"

type SourceType string

const (
	LocalSourceType SourceType = "local"
	GitSourceType   SourceType = "git"
)

type SkillSource struct {
	Type      SourceType
	LocalPath string
	GitURL    string
	GitRef    string
	Subdir    string
}

func ParseSource(source, ref, subdir string) SkillSource {
	if IsGitSource(source) {
		return SkillSource{Type: GitSourceType, GitURL: source, GitRef: ref, Subdir: subdir}
	}
	return SkillSource{Type: LocalSourceType, LocalPath: source}
}

func IsGitSource(source string) bool {
	return strings.HasPrefix(source, "https://") ||
		strings.HasPrefix(source, "http://") ||
		strings.HasPrefix(source, "git@") ||
		strings.HasPrefix(source, "file://")
}
