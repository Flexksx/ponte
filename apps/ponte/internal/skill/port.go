package skill

type Resolver func(source SkillSource) (resolvedDirPath string, err error)
