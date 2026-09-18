import { basename } from "node:path";
import {
  MissingSkillFileError,
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
  const read = async (source: string, directory: string): Promise<string> => {
    const text = await deps.readTextFile(skillFilePath(directory));
    if (text === null) {
      throw new MissingSkillFileError(source, directory);
    }
    return parseSkillName(source, directory, text);
  };

  const readOrNull = async (directory: string): Promise<string | null> => {
    const text = await deps.readTextFile(skillFilePath(directory));
    if (text === null) {
      return null;
    }
    try {
      return parseSkillName(directory, directory, text);
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
