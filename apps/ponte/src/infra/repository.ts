import { dirname } from "node:path";
import { parseGitHubRepository, type ReadRepository } from "@ponte/core";
import { $ } from "bun";
import { directoryExists } from "./filesystem";

export const readRepository: ReadRepository = async path => {
  const directory = (await directoryExists(path)) ? path : dirname(path);
  const result = await $`git -C ${directory} remote get-url origin`
    .nothrow()
    .quiet();
  return result.exitCode === 0
    ? parseGitHubRepository(result.stdout.toString())
    : null;
};
