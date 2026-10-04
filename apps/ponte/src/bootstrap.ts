import type { App, Warn } from "@ponte/core";
import { createFindProject } from "./app/find-project";
import {
  createFetchSkill,
  createResolveProjectSkills,
  createVendorSkill,
} from "./app/project-resolve";
import {
  createListConfigSkills,
  createListProjectSkills,
} from "./app/project-skills";
import { createGetProjectStatusReport } from "./app/project-status";
import { createSyncProject } from "./app/project-sync";
import { createRunProjectUpdate } from "./app/project-update";
import { createSkillNames } from "./app/skill-name";
import { createBuildVendorPlans } from "./app/vendor-resolve";
import { createGetStatusReport } from "./app/vendor-status";
import { createSyncVendors } from "./app/vendor-sync";
import { createReadVendorVersions } from "./app/vendor-versions";
import { createWorkspace } from "./app/workspace";
import { createConfigStore, createPromptStore } from "./infra/config-file";
import { listFiles, readSkillFile, vendoredSkills } from "./infra/filesystem";
import { createSources } from "./infra/git";
import { linkStore } from "./infra/links";
import {
  currentDirectory,
  currentPlatform,
  homeDirectory,
  pontePaths,
} from "./infra/paths";
import { projectFiles } from "./infra/project-file";
import { readVersionOutput } from "./infra/version";

type BootstrapDeps = {
  warn: Warn;
};

// The composition root: the one place that wires adapters into use cases.
export const bootstrap = (deps: BootstrapDeps): App => {
  const platform = currentPlatform();
  const directories = pontePaths();
  const config = createConfigStore(directories);
  const prompts = createPromptStore(directories);
  const sources = createSources(directories, deps.warn);
  const readVendorVersions = createReadVendorVersions({ readVersionOutput });

  const skillNames = createSkillNames({ readSkillFile });
  const buildVendorPlans = createBuildVendorPlans({
    sources,
    listSubagentFiles: listFiles,
    skillNames,
    readVendorVersions,
    home: homeDirectory(),
    platform,
    configDirectory: directories.config,
  });
  const fetchSkill = createFetchSkill({ sources, skillNames });
  const vendorSkill = createVendorSkill({ vendoredSkills });
  const resolveProjectSkills = createResolveProjectSkills({
    projectFiles,
    sources,
    vendoredSkills,
    skillNames,
    fetchSkill,
    vendorSkill,
  });

  return createWorkspace({
    findProject: createFindProject({
      projectFiles,
      cwd: currentDirectory(),
      platform,
      readVendorVersions,
    }),
    config,
    prompts,
    syncProject: createSyncProject({
      resolveProjectSkills,
      links: linkStore,
      projectFiles,
    }),
    syncVendors: createSyncVendors({
      config,
      prompts,
      links: linkStore,
      buildVendorPlans,
      configDirectory: directories.config,
    }),
    getProjectStatusReport: createGetProjectStatusReport({
      resolveProjectSkills,
      links: linkStore,
    }),
    getStatusReport: createGetStatusReport({
      prompts,
      links: linkStore,
      buildVendorPlans,
    }),
    listProjectSkills: createListProjectSkills({ projectFiles, skillNames }),
    listConfigSkills: createListConfigSkills({
      skillNames,
      configDirectory: directories.config,
    }),
    runProjectUpdate: createRunProjectUpdate({
      projectFiles,
      sources,
      fetchSkill,
      vendorSkill,
      vendoredSkills,
    }),
  });
};
