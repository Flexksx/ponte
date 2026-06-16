package skill

type SourceType string

const (
	LocalSourceType SourceType = "local"
	GitSourceType   SourceType = "git"
)

type SkillSource struct {
	Type      SourceType `toml:"type"`
	LocalPath string     `toml:"path"`
	GitURL    string     `toml:"url"`
	GitRef    string     `toml:"ref"`
	Subdir    string     `toml:"subdir"`
}
