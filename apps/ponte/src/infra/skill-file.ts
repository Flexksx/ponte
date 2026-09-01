import { join } from "node:path";
import { SKILL_FILE } from "../domain/skill";

export const skillFilePath = (directory: string): string => join(directory, SKILL_FILE);

export const readSkillFile = async (directory: string): Promise<string | null> => {
  const file = Bun.file(skillFilePath(directory));
  return (await file.exists()) ? await file.text() : null;
};
