declare namespace process {
  export const env: Record<string, string>;
  const platform: string;
  export const stdout: { write(s: string): void };
  export const stderr: { write(s: string): void };
  function exit(code: number): never;
  function cwd(): string;
}

declare namespace Bun {
  const env: Record<string, string>;
  const argv: readonly string[];
  const file: (path: string) => BunFile;
  function write(path: string, data: string | Uint8Array): Promise<void>;
  function symlink(target: string, link: string): void;
  const TOML: {
    parse(text: string): Record<string, unknown>;
    stringify(value: unknown): string;
  };
}

interface BunFile {
  exists(): Promise<boolean>;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function relative(from: string, to: string): string;
}

declare module "node:crypto" {
  export type Hash = {
    update(data: string | Uint8Array): Hash;
    digest(encoding?: string): string;
  };
  export function createHash(algorithm: string): Hash;
}

declare module "node:util" {
  export type Args = {
    args: readonly string[];
    options: Record<
      string,
      { type: "string" | "boolean"; short?: string; multiple?: boolean }
    >;
    allowPositionals?: boolean;
    strict?: boolean | "strict" | "loose";
  };
  export function parseArgs(config: Args): {
    values: Record<string, string | boolean | string[]>;
    positionals: string[];
    tokens: unknown[];
  };
}

declare module "node:os" {
  export function tmpdir(): string;
  export function homedir(): string;
}

declare module "bun" {
  export type ShellResult = {
    exitCode: number;
    stdout: { toString(): string };
    stderr: { toString(): string };
  };
  export type Shell = {
    quiet(): Promise<ShellResult>;
    cwd(path: string): Shell;
    env(env: Record<string, string>): Shell;
    nothrow(): Shell;
  };
  export function $(strings: TemplateStringsArray, ...values: unknown[]): Shell;
}

declare module "node:fs/promises" {
  export type Dirent = {
    name: string;
    parentPath?: string;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  };

  export type Stat = {
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  };

  export function stat(path: string): Promise<Stat>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function writeFile(path: string, data: string): Promise<void>;
  export function mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  export function rm(path: string, opts?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function cp(src: string, dst: string, opts?: { recursive?: boolean }): Promise<void>;
  export function chmod(path: string, mode: string | number): Promise<void>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function symlink(target: string, link: string): Promise<void>;
  export function readlink(path: string): Promise<string>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function readdir(
    path: string,
    opts?: { recursive?: boolean; withFileTypes?: false },
  ): Promise<string[]>;
  export function readdir(
    path: string,
    opts?: { recursive?: boolean; withFileTypes: true },
  ): Promise<Dirent[]>;
}

declare module "bun:test" {
  export type TestFn = (name: string, fn: () => void | Promise<void>) => void;
  export const describe: (name: string, fn: () => void) => void;
  export const it: TestFn;
  export const test: TestFn;
  export function expect(received: unknown): {
    toBe(want: unknown): void;
    toEqual(want: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toContain(want: unknown): void;
    toBeGreaterThan(want: number): void;
    toBeGreaterThanOrEqual(want: number): void;
    toBeNull(): void;
    toHaveLength(want: number): void;
    readonly not: {
      toBe(want: unknown): void;
      toEqual(want: unknown): void;
      toContain(want: unknown): void;
      toBeGreaterThan(want: number): void;
    };
  };
  export function mock<T>(modulePath: string, factory: () => T): Promise<T>;
}

declare module "*.md" {
  const content: string;
  export default content;
}