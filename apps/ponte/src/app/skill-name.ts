import { basename } from "node:path";
import {
  parseSkillName,
  type ReadTextFile,
  skillFilePath,
  VendoredSkillRenamedError,
} from "@ponte/core";

export type SkillNames = {
  readonly read: (source: string, directory: string) => Promise<string>;
  readonly readOrNull: (directory: string) => Promise<string | null>;
  readonly checkVendored: (source: string, directory: string) => Promise<void>;
};

type SkillNamesDeps = {
  readTextFile: ReadTextFile;
};

export const createSkillNames = (deps: SkillNamesDeps): SkillNames => {
  const read = async (source: string, directory: string): Promise<string> =>
    parseSkillName(
      source,
      directory,
      await deps.readTextFile(skillFilePath(directory)),
    );

  const readOrNull = async (directory: string): Promise<string | null> => {
    try {
      return await read(directory, directory);
    } catch {
      return null;
    }
  };

  const checkVendored = async (
    source: string,
    directory: string,
  ): Promise<void> => {
    const name = basename(directory);
    const declared = await read(source, directory);
    if (declared !== name) {
      throw new VendoredSkillRenamedError(directory, name, declared);
    }
  };

  return { read, readOrNull, checkVendored };
};
