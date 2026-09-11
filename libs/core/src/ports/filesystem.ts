export type FileExists = (path: string) => Promise<boolean>;
export type DirectoryExists = (path: string) => Promise<boolean>;
export type WriteText = (path: string, content: string) => Promise<void>;
export type ListFiles = (directory: string) => Promise<string[]>;
export type RemoveDirectory = (path: string) => Promise<void>;
export type CopyDirectoryWithoutGit = (
  from: string,
  to: string,
) => Promise<void>;
export type DirectoriesDiffer = (
  left: string,
  right: string,
) => Promise<boolean>;
