import { chmod, mkdir, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir as osTmpdir } from "node:os";
import { dirname, join } from "node:path";
import { $ } from "bun";
import type { VendorName } from "../../src/domain/vendor";

let binaryUnderTest = "";
let binaryResolve: Promise<string> | null = null;

const resolveBinary = (): Promise<string> => {
  if (binaryUnderTest) return Promise.resolve(binaryUnderTest);
  if (binaryResolve) return binaryResolve;
  binaryResolve = (async () => {
    const here = new URL(import.meta.url).pathname;
    const slash = here.lastIndexOf("/");
    const root = `${here.slice(0, slash)}/../..`;
    const bin = join(await osTmpdir(), `ponte-e2e-bin-${randId()}`);
    await mkdir(bin, { recursive: true });
    const out = join(bin, process.platform === "win32" ? "ponte.exe" : "ponte");
    const build = await $`bun build ${root}/src/index.ts --compile --outfile ${out}`.quiet();
    if (build.exitCode !== 0) {
      throw new Error(`could not build ponte for e2e: ${build.stderr.toString()}`);
    }
    binaryUnderTest = out;
    return out;
  })();
  return binaryResolve;
};

export const setBinaryPath = (path: string): void => {
  binaryUnderTest = path;
};

export const binaryPath = (): string => {
  return binaryUnderTest;
};

export const newHarness = async (): Promise<Home> => {
  const home = join(await osTmpdir(), `ponte-e2e-${randId()}`);
  await mkdir(home, { recursive: true });
  return new Home(home);
};

const randId = () => Math.random().toString(36).slice(2, 10);

export class Home {
  readonly home: string;
  private cleanups: Array<() => Promise<void>> = [];

  constructor(home: string) {
    this.home = home;
    this.cleanups.push(async () => makeWritable(home));
  }

  configPath(name: string): string {
    return join(this.home, ".config", "ponte", name);
  }

  private runEnv(): Record<string, string> {
    return {
      HOME: this.home,
      USERPROFILE: this.home,
      XDG_CONFIG_HOME: "",
      PATH: Bun.env.PATH ?? process.env.PATH ?? "",
    };
  }

  async run(...args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const env = this.runEnv();
    const binary = await resolveBinary();
    const proc = await $`${binary} ${args}`.env(env).nothrow().quiet();
    return {
      stdout: proc.stdout.toString(),
      stderr: proc.stderr.toString(),
      exitCode: proc.exitCode,
    };
  }

  async mustRun(...args: string[]): Promise<{ stdout: string; stderr: string }> {
    const res = await this.run(...args);
    if (res.exitCode !== 0) {
      throw new Error(
        `ponte ${args.join(" ")} exited ${res.exitCode}\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
      );
    }
    return res;
  }

  async bootstrap(): Promise<void> {
    await this.mustRun("sync");
  }

  async writeFile(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }

  async readFileText(path: string): Promise<string> {
    return await readFile(path, "utf8");
  }

  async assertFileEquals(path: string, want: string): Promise<void> {
    const got = await this.readFileText(path);
    if (got !== want) {
      throw new Error(`content mismatch at ${path}\n--- want ---\n${want}\n--- got ---\n${got}`);
    }
  }

  vendorPaths(): Record<VendorName, string> {
    return {
      "claude-code": join(this.home, ".claude", "CLAUDE.md"),
      codex: join(this.home, ".codex", "instructions.md"),
      "antigravity-cli": join(this.home, ".gemini", "GEMINI.md"),
      "cursor-agent": join(this.home, ".cursor", "rules", "global.mdc"),
      opencode: join(this.home, ".config", "opencode", "AGENTS.md"),
      "pi-agent": join(this.home, ".pi", "agent", "AGENTS.md"),
    };
  }

  vendorSkillsDirs(): Record<VendorName, string> {
    return {
      "claude-code": join(this.home, ".claude", "skills"),
      codex: join(this.home, ".codex", "skills"),
      "antigravity-cli": join(this.home, ".gemini", "antigravity-cli", "skills"),
      "cursor-agent": join(this.home, ".cursor", "skills"),
      opencode: join(this.home, ".config", "opencode", "skills"),
      "pi-agent": join(this.home, ".pi", "agent", "skills"),
    };
  }

  vendorSkillPath(vendor: VendorName, skillName: string): string {
    return join(this.vendorSkillsDirs()[vendor], skillName);
  }

  vendorAgentsDirs(): Record<VendorName, string> {
    return {
      "claude-code": join(this.home, ".claude", "agents"),
      codex: join(this.home, ".codex", "agents"),
      "antigravity-cli": join(this.home, ".gemini", "antigravity-cli", "agents"),
      "cursor-agent": join(this.home, ".cursor", "agents"),
      opencode: join(this.home, ".config", "opencode", "agents"),
      "pi-agent": join(this.home, ".pi", "agent", "agents"),
    };
  }

  vendorAgentPath(vendor: VendorName, agentFile: string): string {
    return join(this.vendorAgentsDirs()[vendor], agentFile);
  }

  storePath(): string {
    return join(this.home, ".local", "share", "ponte", "store");
  }

  async assertIsStoreSymlink(path: string): Promise<void> {
    const target = await readlink(path);
    if (!target.startsWith(this.storePath())) {
      throw new Error(`expected symlink target inside store ${this.storePath()}, got ${target}`);
    }
  }

  fixturePath(name: string): string {
    const here = new URL(import.meta.url).pathname;
    const slash = here.lastIndexOf("/");
    const dir = here.slice(0, slash);
    return join(dir, "fixtures", name);
  }

  fixtureDir(name: string): string {
    const here = new URL(import.meta.url).pathname;
    const slash = here.lastIndexOf("/");
    const dir = here.slice(0, slash);
    return join(dir, "fixtures", name);
  }

  cleanup(fn: () => Promise<void>): void {
    this.cleanups.push(fn);
  }

  async close(): Promise<void> {
    await makeWritable(this.home);
    for (const fn of this.cleanups.reverse()) {
      await fn();
    }
    await rm(this.home, { recursive: true, force: true });
  }
}

const makeWritable = async (root: string): Promise<void> => {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(root, { recursive: true });
    for (const rel of entries) {
      const abs = rel.startsWith("/") ? rel : join(root, rel);
      try {
        await chmod(abs, 0o755);
      } catch {
        void 0;
      }
    }
    await chmod(root, 0o755);
  } catch {
    void 0;
  }
};
