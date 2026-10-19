import { join } from "node:path";
import {
  type ConfigIssue,
  MAX_SKILL_NAME_LENGTH,
  type Problem,
  REPO_CONFIG_FILE,
  REPO_SOURCES_DIRECTORY,
  SKILL_FILE,
  VENDORS,
} from "@ponte/core";

const describeIssue = (issue: ConfigIssue): string => {
  switch (issue.kind) {
    case "schema":
      return issue.path === ""
        ? issue.message
        : `${issue.path}: ${issue.message}`;
    case "unknown-vendor-entry":
      return `${issue.path}.${issue.name}: unknown agent, expected one of ${VENDORS.join(", ")}`;
  }
};

export const describeProblem = (problem: Problem): string => {
  switch (problem.kind) {
    case "invalid-config":
      return problem.issues.map(describeIssue).join("\n");
    case "no-config":
      return "config not initialized - run `ponte sync` first";
    case "prompt-not-found":
      return `system prompt not found: ${problem.file}`;
    case "no-prompt":
      return "No system prompt set. Use `ponte sysprompt set <file-or-string>`.";
    case "no-vendors-enabled":
      return "no agents enabled in config - run with -a to specify agents";
    case "unknown-vendor":
      return `unknown agent: ${problem.name}`;
    case "missing-git-ref":
      return `git source ${problem.url} needs a ref`;
    case "source-not-directory":
      return `skill source is not a directory: ${problem.path}`;
    case "missing-skill-file":
      return `skill ${problem.source}: no ${SKILL_FILE} in ${problem.directory} - every skill directory needs one`;
    case "missing-frontmatter":
      return `skill ${problem.source}: ${problem.file} has no frontmatter - add a --- block that declares name`;
    case "missing-skill-name":
      return `skill ${problem.source}: the frontmatter in ${problem.file} declares no name`;
    case "invalid-skill-name":
      return `skill ${problem.source}: ${SKILL_FILE} declares the invalid name "${problem.name}" - a name holds 1 to ${MAX_SKILL_NAME_LENGTH} characters from a-z, 0-9 and single hyphens, and it starts and ends with a letter or a digit`;
    case "duplicate-skill-name":
      return `two skills declare the name "${problem.name}": ${problem.first} and ${problem.second} - remove one of the entries`;
    case "vendored-skill-renamed":
      return `vendored skill ${problem.directory}: its ${SKILL_FILE} declares name "${problem.declared}" but the directory is named "${problem.name}" - restore the name, or delete the directory and run ponte sync`;
    case "unknown-vendored-skill":
      return `unknown vendored skill: ${problem.name} - ponte update works on the git skills that ${REPO_CONFIG_FILE} declares and ${REPO_SOURCES_DIRECTORY} holds`;
    case "modified-vendored-skills":
      return `${problem.names.join(", ")}: the vendored copy differs from its locked commit, or the lock entry is missing - commit the copy, or pass --force to overwrite it`;
    case "skill-renamed":
      return `${problem.name}: the source now declares the name "${problem.declared}" - run ponte sync to vendor the skill under the new name, then delete ${join(REPO_SOURCES_DIRECTORY, problem.name)} by hand`;
    case "not-in-repo":
      return `no ${REPO_CONFIG_FILE} in this directory or any parent directory`;
    case "global-options-in-repo":
      return "-g and -a apply to a global sync only, and this directory is a repo";
    case "invalid-workspace-name":
      return `invalid workspace name "${problem.name}" - use a-z, 0-9 and hyphens, starting with a letter or a digit`;
    case "workspace-exists":
      return `workspace ${problem.name} already exists`;
    case "workspace-not-found":
      return `no workspace named ${problem.name} - run ponte ws to list them`;
    case "link-not-found":
      return `the workspace has no link ${problem.target}`;
    case "invalid-tag":
      return `invalid tag "${problem.tag}" - use a-z, 0-9 and hyphens, starting with a letter or a digit`;
    case "tag-not-found":
      return `the workspace has no tag ${problem.tag}`;
    case "workspace-already-done":
      return `workspace ${problem.name} is already done - ponte ws reopen ${problem.name} reopens it`;
    case "workspace-not-done":
      return `workspace ${problem.name} is not done`;
    case "invalid-workspace-file":
      return `${problem.file}: ${problem.message}`;
  }
};
