import { basename } from "node:path";
import {
  checkVendoredSkillName,
  parseSkillName,
  type ReadSkillFile,
  type Result,
  type SkillProblem,
} from "@ponte/core";

export type SkillNames = {
  readonly read: (
    source: string,
    directory: string,
  ) => Promise<Result<string, SkillProblem>>;
  readonly readOrNull: (directory: string) => Promise<string | null>;
  readonly checkVendored: (
    source: string,
    directory: string,
  ) => Promise<Result<null, SkillProblem>>;
};

type SkillNamesDeps = {
  readSkillFile: ReadSkillFile;
};

export const createSkillNames = (deps: SkillNamesDeps): SkillNames => {
  const read = async (
    source: string,
    directory: string,
  ): Promise<Result<string, SkillProblem>> =>
    parseSkillName(source, directory, await deps.readSkillFile(directory));

  const readOrNull = async (directory: string): Promise<string | null> => {
    const name = await read(directory, directory);
    return name.ok ? name.value : null;
  };

  const checkVendored = async (
    source: string,
    directory: string,
  ): Promise<Result<null, SkillProblem>> => {
    const declared = await read(source, directory);
    return declared.ok
      ? checkVendoredSkillName(directory, basename(directory), declared.value)
      : declared;
  };

  return { read, readOrNull, checkVendored };
};
