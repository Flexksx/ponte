import type { App, Warn } from "@ponte/core";
import { createFindRepo } from "./app/find-repo";
import {
  createFetchSkill,
  createResolveRepoSkills,
  createVendorSkill,
} from "./app/repo-resolve";
import {
  createListConfigSkills,
  createListRepoSkills,
} from "./app/repo-skills";
import { createGetRepoStatusReport } from "./app/repo-status";
import { createSyncRepo } from "./app/repo-sync";
import { createRunRepoUpdate } from "./app/repo-update";
import { createSkillNames } from "./app/skill-name";
import { createBuildVendorPlans } from "./app/vendor-resolve";
import { createGetStatusReport } from "./app/vendor-status";
import { createSyncVendors } from "./app/vendor-sync";
import { createReadVendorVersions } from "./app/vendor-versions";
import { createApp } from "./app/app";
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
import { repoFiles } from "./infra/repo-file";
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
  const resolveRepoSkills = createResolveRepoSkills({
    repoFiles,
    sources,
    vendoredSkills,
    skillNames,
    fetchSkill,
    vendorSkill,
  });

  return createApp({
    findRepo: createFindRepo({
      repoFiles,
      cwd: currentDirectory(),
      platform,
      readVendorVersions,
    }),
    config,
    prompts,
    syncRepo: createSyncRepo({
      resolveRepoSkills,
      links: linkStore,
      repoFiles,
    }),
    syncVendors: createSyncVendors({
      config,
      prompts,
      links: linkStore,
      buildVendorPlans,
      configDirectory: directories.config,
    }),
    getRepoStatusReport: createGetRepoStatusReport({
      resolveRepoSkills,
      links: linkStore,
    }),
    getStatusReport: createGetStatusReport({
      prompts,
      links: linkStore,
      buildVendorPlans,
    }),
    listRepoSkills: createListRepoSkills({ repoFiles, skillNames }),
    listConfigSkills: createListConfigSkills({
      skillNames,
      configDirectory: directories.config,
    }),
    runRepoUpdate: createRunRepoUpdate({
      repoFiles,
      sources,
      fetchSkill,
      vendorSkill,
      vendoredSkills,
    }),
  });
};
