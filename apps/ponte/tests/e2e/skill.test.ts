import { describe, it, expect } from "bun:test";
import { $ } from "bun";
import { join } from "node:path";
import { mkdir, writeFile, readlink } from "node:fs/promises";
import { tmpdir as osTmpdir } from "node:os";
import { newHarness } from "./harness";

const isWindows = () => process.platform === "win32";

const writeConfigWithGitSkill = async (
  h: any,
  skillName: string,
  repoURL: string,
  ref: string,
) => {
  const cfg = await h.readFileText(h.configPath("config.toml"));
  const entry =
    `\n[skills.${skillName}]\nsource = ${JSON.stringify(repoURL)}\nref = ${JSON.stringify(ref)}\n`;
  await h.writeFile(h.configPath("config.toml"), cfg + entry);
};

describe("skill sync", () => {
  // A local skill declared in config must appear as a symlink inside every
  // enabled vendor's skills directory after sync.
  it("appears in every vendor skills dir after sync", async () => {
    if (isWindows()) return; // symlink assertions require Unix
    const h = await newHarness();
    await h.bootstrap();

    const skillFixtureDir = h.fixtureDir("simple_skill");
    await appendConfigWithSkill(h, "simple-skill", skillFixtureDir);

    await h.mustRun("sync");

    for (const [, skillsDir] of Object.entries(h.vendorSkillsDirs())) {
      const skillMD = join(skillsDir as string, "simple-skill", "SKILL.md");
      const got = await h.readFileText(skillMD);
      expect(got).toContain("simple-skill");
    }
    await h.close();
  });

  // Vendor skill entries must be symlinks pointing into the store, not copies.
  it("symlinks the skill from the store", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const skillFixtureDir = h.fixtureDir("simple_skill");
    await appendConfigWithSkill(h, "simple-skill", skillFixtureDir);

    await h.mustRun("sync");

    await h.assertIsStoreSymlink(h.vendorSkillPath("claude-code", "simple-skill"));
    await h.close();
  });

  // Instruction files must also be symlinks into the store after sync.
  it("symlinks the instruction file from the store", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    await h.assertIsStoreSymlink(h.vendorPaths()["claude-code"]);
    await h.close();
  });

  // Two syncs with identical inputs produce the same store generation: the
  // symlink target does not change.
  it("reuses the store generation on identical inputs", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const skillFixtureDir = h.fixtureDir("simple_skill");
    await appendConfigWithSkill(h, "simple-skill", skillFixtureDir);
    await h.mustRun("sync");

    const firstTarget = await readlink(h.vendorPaths()["claude-code"]);
    await h.mustRun("sync");
    const secondTarget = await readlink(h.vendorPaths()["claude-code"]);

    expect(secondTarget).toBe(firstTarget);
    await h.close();
  });

  // Adding a skill changes the store generation: the symlink target moves to
  // a new generation that contains the skill.
  it("creates a new generation when a skill is added", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();
    await h.mustRun("sync");

    const firstTarget = await readlink(h.vendorPaths()["claude-code"]);

    const skillFixtureDir = h.fixtureDir("simple_skill");
    await appendConfigWithSkill(h, "simple-skill", skillFixtureDir);
    await h.mustRun("sync");

    const secondTarget = await readlink(h.vendorPaths()["claude-code"]);
    expect(secondTarget).not.toBe(firstTarget);

    const skillMD = join(h.vendorSkillPath("claude-code", "simple-skill"), "SKILL.md");
    expect(await h.readFileText(skillMD)).toContain("simple-skill");
    await h.close();
  });

  // A git-backed skill is cloned, checked out at the given ref, and symlinked
  // into vendor skill directories.
  it("clones and links a git skill", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const { repoPath, commitSHA } = await createLocalGitSkillRepo();

    await writeConfigWithGitSkill(h, "git-skill", "file://" + repoPath, commitSHA);

    await h.mustRun("sync");

    const skillMD = join(h.vendorSkillPath("claude-code", "git-skill"), "SKILL.md");
    expect(await h.readFileText(skillMD)).toContain("git-skill");
    await h.close();
  });
});

async function appendConfigWithSkill(
  h: any,
  skillName: string,
  skillDirPath: string,
): Promise<void> {
  const cfg = await h.readFileText(h.configPath("config.toml"));
  const entry = `\n[skills.${skillName}]\nsource = ${JSON.stringify(skillDirPath)}\n`;
  await h.writeFile(h.configPath("config.toml"), cfg + entry);
}

// createLocalGitSkillRepo initialises a non-bare git repo containing a skill
// directory and returns the repo path and the HEAD commit SHA. A local repo
// stands in for a remote so the test needs no network.
async function createLocalGitSkillRepo(): Promise<{ repoPath: string; commitSHA: string }> {
  const repoPath = join(osTmpdir(), `ponte-git-skill-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(repoPath, { recursive: true });

  const git = async (...args: string[]): Promise<string> => {
    const res = await $`git ${args}`.cwd(repoPath).quiet();
    if (res.exitCode !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${res.stdout}${res.stderr}`);
    }
    return res.stdout.toString();
  };

  await git("init");
  await git("config", "user.email", "test@example.com");
  await git("config", "user.name", "Test");
  await writeFile(join(repoPath, "SKILL.md"), "---\nname: git-skill\n---\n# Git Skill\n");
  await git("add", ".");
  await git("commit", "-m", "add skill");
  const commitSHA = (await git("rev-parse", "HEAD")).trim();

  return { repoPath, commitSHA };
}