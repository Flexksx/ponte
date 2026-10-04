import type { ReadVersionOutput } from "@ponte/core";
import { $ } from "bun";

export const readVersionOutput: ReadVersionOutput = async command => {
  const path = Bun.which(command);
  if (path === null) {
    return null;
  }
  const result = await $`${path} --version`.nothrow().quiet();
  return result.exitCode === 0 ? result.stdout.toString() : null;
};
