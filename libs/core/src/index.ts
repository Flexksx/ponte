export {
  buildConfig,
  buildPontePaths,
  type Config,
  type ConfigIssue,
  type ConfigProblem,
  createDefaultConfig,
  type DirectoriesInput,
  type PontePaths,
  type RawConfig,
  type RawVendorTable,
  resolveConfigPaths,
  resolvePromptPath,
  resolveVendors,
  type VendorConfig,
} from "./domain/config";
export type * from "./domain/config/out.ports";
export {
  type Bootstrap,
  buildVendorPlan,
  getLinkState,
  getStaleLinkPaths,
  type Link,
  type LinkPlan,
  type LinkProblem,
  type LinkState,
  type ResolvedSubagent,
  type StatusReport,
  type SyncReport,
  type VendorStatus,
} from "./domain/link";
export type * from "./domain/link/out.ports";
export {
  buildProjectConfig,
  buildProjectPlan,
  buildUpdateTargets,
  createLockEntry,
  findLockedSkillName,
  getProjectEnabledVendors,
  getProjectState,
  type LockEntry,
  locksAreEqual,
  PROJECT_CONFIG_FILE,
  PROJECT_CONFIG_KEYS,
  PROJECT_SKILLS_DIRECTORY,
  PROJECT_SOURCES_DIRECTORY,
  type Project,
  type ProjectConfig,
  type ProjectLayout,
  type ProjectLock,
  type ProjectProblem,
  type ProjectSkillTarget,
  type ProjectStatusReport,
  type ProjectSyncReport,
  type ProjectUpdateReport,
  projectLayout,
  type RawProjectConfig,
  resolveProjectConfigPaths,
  type UpdatedSkill,
  type UpdateTarget,
  vendoredSkillPath,
} from "./domain/project";
export type * from "./domain/project/out.ports";
export { collect, err, ok, type Result } from "./domain/shared";
export type * from "./domain/shared/out.ports";
export {
  checkVendoredSkillName,
  MAX_SKILL_NAME_LENGTH,
  type NamedSkill,
  parseSkillName,
  type ResolvedSkill,
  requireUniqueSkillNames,
  SKILL_FILE,
  type SkillProblem,
  type SkillRow,
  skillFilePath,
} from "./domain/skill";
export type * from "./domain/skill/out.ports";
export {
  describeSourceEntry,
  isGitSource,
  parseSource,
  parseSourceEntry,
  type SkillSource,
  type SourceEntry,
  type SourceProblem,
} from "./domain/source";
export type * from "./domain/source/out.ports";
export {
  buildVendorLayouts,
  CLAUDE_CODE_SHARED_SKILLS_VERSION,
  type LayoutInput,
  type LayoutScope,
  type Platform,
  parseVersion,
  VENDORS,
  VERSION_COMMANDS,
  type VendorLayout,
  type VendorName,
  type VendorProblem,
  type VendorVersions,
} from "./domain/vendor";
export type * from "./domain/vendor/out.ports";
export type {
  Problem,
  SkillListing,
  StatusOutcome,
  SyncOutcome,
  SyncRequest,
  WorkspaceProblem,
} from "./domain/workspace";
export type * from "./domain/workspace/in.ports";
