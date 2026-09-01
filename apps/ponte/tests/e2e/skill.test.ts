import { describe, expect, it } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir as osTmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import type { Home } from "./harness";
import { newHarness, skillDoc, skillEntry } from "./harness";

const isWindows = () => process.platform === "win32";

const createLocalGitSkillRepo = async (
  name: string,
): Promise<{ repoPath: string; commitSHA: string }> => {
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
  await writeFile(join(repoPath, "SKILL.md"), skillDoc(name));
  await git("add", ".");
  await git("commit", "-m", "add skill");
  const commitSHA = (await git("rev-parse", "HEAD")).trim();

  return { repoPath, commitSHA };
};

const localSkill = async (h: Home, directory: string, content: string): Promise<string> => {
  const path = join(h.home, "skills", directory);
  await h.writeSkill(path, content);
  return path;
};

describe("skill sync", () => {
  it("appears in every vendor skills dir after sync", async () => {
    if (isWindows()) return; // symlink assertions require Unix
    const h = await newHarness();
    await h.bootstrap();

    await h.appendConfig(skillEntry(h.fixtureDir("simple_skill")));

    await h.mustRun("sync");

    for (const [, skillsDir] of Object.entries(h.vendorSkillsDirs())) {
      const skillMD = join(skillsDir as string, "simple-skill", "SKILL.md");
      const got = await h.readFileText(skillMD);
      expect(got).toContain("simple-skill");
    }
    await h.close();
  });

  it("symlinks the skill straight to its source directory", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const skillFixtureDir = h.fixtureDir("simple_skill");
    await h.appendConfig(skillEntry(skillFixtureDir));

    await h.mustRun("sync");

    await h.assertSymlinkTo(h.vendorSkillPath("claude-code", "simple-skill"), skillFixtureDir);
    await h.close();
  });

  it("symlinks the instruction file to the configured prompt", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    await h.assertSymlinkTo(h.vendorPaths()["claude-code"], h.configPath("AGENTS.md"));
    await h.close();
  });

  it("removes the link when a skill leaves the config", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const before = await h.readFileText(h.configPath("config.toml"));
    await h.appendConfig(skillEntry(h.fixtureDir("simple_skill")));
    await h.mustRun("sync");
    await h.assertSymlinkTo(
      h.vendorSkillPath("claude-code", "simple-skill"),
      h.fixtureDir("simple_skill"),
    );

    await h.writeFile(h.configPath("config.toml"), before);
    const { stdout } = await h.mustRun("sync");

    expect(stdout).toContain("stale link(s) removed");
    await h.assertMissing(h.vendorSkillPath("claude-code", "simple-skill"));
    await h.close();
  });

  it("leaves a directory it did not create alone", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const mine = h.vendorSkillPath("claude-code", "mine");
    await h.writeFile(join(mine, "SKILL.md"), "hand written");
    await h.mustRun("sync");

    expect(await h.readFileText(join(mine, "SKILL.md"))).toBe("hand written");
    await h.close();
  });

  it("clones and links a git skill under its frontmatter name", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const { repoPath, commitSHA } = await createLocalGitSkillRepo("git-skill");
    await h.appendConfig(skillEntry(`file://${repoPath}`, commitSHA));

    await h.mustRun("sync");

    const skillMD = join(h.vendorSkillPath("claude-code", "git-skill"), "SKILL.md");
    expect(await h.readFileText(skillMD)).toContain("git-skill");
    await h.close();
  });
});

describe("skill name derivation", () => {
  it("names the link after the frontmatter, not the directory", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const directory = await localSkill(h, "on-disk-directory", skillDoc("declared-name"));
    await h.appendConfig(skillEntry(directory));

    await h.mustRun("sync");

    await h.assertSymlinkTo(h.vendorSkillPath("claude-code", "declared-name"), directory);
    await h.assertMissing(h.vendorSkillPath("claude-code", "on-disk-directory"));
    await h.close();
  });

  it("accepts a quoted frontmatter name", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const directory = await localSkill(h, "quoted", '---\nname: "quoted"\n---\n# Quoted\n');
    await h.appendConfig(skillEntry(directory));

    await h.mustRun("sync");

    await h.assertSymlinkTo(h.vendorSkillPath("claude-code", "quoted"), directory);
    await h.close();
  });

  it("refuses a skill directory with no SKILL.md", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const directory = join(h.home, "skills", "no-skill-file");
    await h.writeFile(join(directory, "notes.md"), "no skill file here\n");
    await h.appendConfig(skillEntry(directory));

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("no SKILL.md");
    expect(stderr).toContain(directory);
    await h.close();
  });

  it("refuses a SKILL.md with no frontmatter", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const directory = await localSkill(h, "bare", "# Bare\n\nNo frontmatter here.\n");
    await h.appendConfig(skillEntry(directory));

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("no frontmatter");
    await h.close();
  });

  it("refuses frontmatter that declares no name", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const directory = await localSkill(h, "nameless", "---\ndescription: no name\n---\n# X\n");
    await h.appendConfig(skillEntry(directory));

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("declares no name");
    await h.close();
  });

  it("refuses a name the specification rejects", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const directory = await localSkill(h, "shouty", skillDoc("Shouty--Name"));
    await h.appendConfig(skillEntry(directory));

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('invalid name "Shouty--Name"');
    await h.close();
  });

  it("refuses two entries that declare the same name", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    const first = await localSkill(h, "copy-one", skillDoc("twin"));
    const second = await localSkill(h, "copy-two", skillDoc("twin"));
    await h.appendConfig(`${skillEntry(first)}\n${skillEntry(second)}`);

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('two skills declare the name "twin"');
    expect(stderr).toContain(first);
    expect(stderr).toContain(second);
    await h.close();
  });

  it("tells the user to migrate a named skill table", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    await h.bootstrap();

    await h.appendConfig(`[skills.my-skill]\nsource = ${JSON.stringify(h.home)}\n`);

    const { stderr, exitCode } = await h.run("sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("[[skills]]");
    expect(stderr).toContain("SKILL.md");
    await h.close();
  });
});
