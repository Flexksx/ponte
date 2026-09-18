import { basename } from "node:path";
import {
  parseSkillName,
  skillFilePath,
  VendoredSkillRenamedError,
} from "@ponte/core";
import { readTextFile } from "../infra/filesystem";

export const readSkillName = async (
  source: string,
  directory: string,
): Promise<string> =>
  parseSkillName(
    source,
    directory,
    await readTextFile(skillFilePath(directory)),
  );

export const readSkillNameOrNull = async (
  directory: string,
): Promise<string | null> => {
  try {
    return await readSkillName(directory, directory);
  } catch {
    return null;
  }
};

export const checkVendoredSkillName = async (
  source: string,
  directory: string,
): Promise<void> => {
  const name = basename(directory);
  const declared = await readSkillName(source, directory);
  if (declared !== name) {
    throw new VendoredSkillRenamedError(directory, name, declared);
  }
};
