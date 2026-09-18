import { describe, expect, it } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir as osTmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import type { Home } from "./harness";
import { newHarness, skillDoc, sourceEntry } from "./harness";

const isWindows = () => process.platform === "win32";

const addSkill = (h: Home, source: string): Promise<void> =>
  h.appendConfig(sourceEntry("skills", source));

const addGitSkill = (h: Home, url: string, ref: string): Promise<void> =>
  h.appendConfig(sourceEntry("skills", url, ref));

const createLocalGitSkillRepo = async (): Promise<{
  repoPath: string;
  commitSHA: string;
}> => {
  const repoPath = join(
    osTmpdir(),
    `ponte-git-skill-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(repoPath, { recursive: true });

  const git = async (...args: string[]): Promise<string> => {
    const res = await $`git ${args}`.cwd(repoPath).quiet();
    if (res.exitCode !== 0) {
      throw new Error(
        `git ${args.join(" ")} failed: ${res.stdout}${res.stderr}`,
      );
    }
    return res.stdout.toString();
  };

  await git("init");
  await git("config", "user.email", "test@example.com");
  await git("config", "user.name", "Test");
  await writeFile(join(repoPath, "SKILL.md"), skillDoc("git-skill"));
  await git("add", ".");
  await git("commit", "-m", "add skill");
  const commitSHA = (await git("rev-parse", "HEAD")).trim();

  return { repoPath, commitSHA };
};

describe("skill sync", () => {
  it("appears in every vendor skills dir after sync", async () => {
    if (isWindows()) {
      return; // symlink assertions require Unix
    }
    const h = await newHarness();
    await h.bootstrap();

    await addSkill(h, h.fixture("simple_skill"));

    await h.mustRun("sync");

    for (const [, skillsDir] of Object.entries(h.vendorSkillsDirs())) {
      const skillMD = join(skillsDir as string, "simple-skill", "SKILL.md");
      const got = await h.readFileText(skillMD);
      expect(got).toContain("simple-skill");
    }
    await h.close();
  });

  it("names the link after the SKILL.md name, not the directory", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    await h.bootstrap();

    const directory = join(h.home, "sources", "some-folder");
    await h.writeSkill(directory, skillDoc("declared-name"));
    await addSkill(h, directory);

    await h.mustRun("sync");

    await h.assertSymlinkTo(
      h.vendorSkillPath("claude-code", "declared-name"),
      directory,
    );
    await h.assertMissing(h.vendorSkillPath("claude-code", "some-folder"));
    await h.close();
  });

  it("symlinks the skill straight to its source directory", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    await h.bootstrap();

    const skillFixtureDir = h.fixture("simple_skill");
    await addSkill(h, skillFixtureDir);

    await h.mustRun("sync");

    await h.assertSymlinkTo(
      h.vendorSkillPath("claude-code", "simple-skill"),
      skillFixtureDir,
    );
    await h.close();
  });

  it("symlinks the instruction file to the configured prompt", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    await h.bootstrap();

    await h.assertSymlinkTo(
      h.vendorPaths()["claude-code"],
      h.configPath("AGENTS.md"),
    );
    await h.close();
  });

  it("removes the link when a skill leaves the config", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    await h.bootstrap();

    const before = await h.readFileText(h.configPath("config.toml"));
    await addSkill(h, h.fixture("simple_skill"));
    await h.mustRun("sync");
    await h.assertSymlinkTo(
      h.vendorSkillPath("claude-code", "simple-skill"),
      h.fixture("simple_skill"),
    );

    await h.writeFile(h.configPath("config.toml"), before);
    const { stdout } = await h.mustRun("sync");

    expect(stdout).toContain("stale link(s) removed");
    await h.assertMissing(h.vendorSkillPath("claude-code", "simple-skill"));
    await h.close();
  });

  it("leaves a directory it did not create alone", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    await h.bootstrap();

    const mine = h.vendorSkillPath("claude-code", "mine");
    await h.writeFile(join(mine, "SKILL.md"), "hand written");
    await h.mustRun("sync");

    expect(await h.readFileText(join(mine, "SKILL.md"))).toBe("hand written");
    await h.close();
  });

  it("clones and links a git skill under its declared name", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    await h.bootstrap();

    const { repoPath, commitSHA } = await createLocalGitSkillRepo();
    await addGitSkill(h, `file://${repoPath}`, commitSHA);

    await h.mustRun("sync");

    const skillMD = join(
      h.vendorSkillPath("claude-code", "git-skill"),
      "SKILL.md",
    );
    expect(await h.readFileText(skillMD)).toContain("git-skill");
    await h.close();
  });
});

describe("skill name errors", () => {
  it("rejects a source with no SKILL.md", async () => {
    const h = await newHarness();
    await h.bootstrap();

    const directory = join(h.home, "sources", "empty");
    await h.writeFile(join(directory, "README.md"), "no skill here\n");
    await addSkill(h, directory);

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("SKILL.md");
    expect(stderr).toContain(directory);
    await h.close();
  });

  it("rejects a SKILL.md with no frontmatter", async () => {
    const h = await newHarness();
    await h.bootstrap();

    const directory = join(h.home, "sources", "bare");
    await h.writeSkill(directory, "# No frontmatter\n");
    await addSkill(h, directory);

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("no frontmatter");
    await h.close();
  });

  it("rejects frontmatter with no name", async () => {
    const h = await newHarness();
    await h.bootstrap();

    const directory = join(h.home, "sources", "nameless");
    await h.writeSkill(directory, "---\ndescription: none\n---\n");
    await addSkill(h, directory);

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("declares no name");
    await h.close();
  });

  it("rejects an invalid name", async () => {
    const h = await newHarness();
    await h.bootstrap();

    const directory = join(h.home, "sources", "shouty");
    await h.writeSkill(directory, skillDoc("Not Valid"));
    await addSkill(h, directory);

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("Not Valid");
    await h.close();
  });

  it("rejects two sources that declare the same name", async () => {
    const h = await newHarness();
    await h.bootstrap();

    const first = join(h.home, "sources", "one");
    const second = join(h.home, "sources", "two");
    await h.writeSkill(first, skillDoc("twin"));
    await h.writeSkill(second, skillDoc("twin"));
    await addSkill(h, first);
    await addSkill(h, second);

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("twin");
    expect(stderr).toContain(second);
    await h.close();
  });
});
