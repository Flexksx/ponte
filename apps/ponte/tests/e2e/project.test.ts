import { describe, expect, it } from "bun:test";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import type { Home } from "./harness";
import { newHarness, skillDoc, skillEntry } from "./harness";

const isWindows = () => process.platform === "win32";

type SkillRepo = {
  readonly path: string;
  readonly url: string;
  readonly sha: string;
  readonly commit: (content: string) => Promise<string>;
};

const randomName = () => Math.random().toString(36).slice(2, 8);

const newSkillRepo = async (h: Home, content: string): Promise<SkillRepo> => {
  const repoPath = join(h.home, "repos", `skill-${randomName()}`);
  await mkdir(repoPath, { recursive: true });

  const git = async (...args: string[]): Promise<string> => {
    const res = await $`git ${args}`.cwd(repoPath).quiet();
    if (res.exitCode !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${res.stdout}${res.stderr}`);
    }
    return res.stdout.toString().trim();
  };

  await git("init");
  await git("config", "user.email", "test@example.com");
  await git("config", "user.name", "Test");

  const commit = async (text: string): Promise<string> => {
    await writeFile(join(repoPath, "SKILL.md"), text);
    await git("add", ".");
    await git("commit", "-m", "update skill");
    return git("rev-parse", "HEAD");
  };

  return { path: repoPath, url: `file://${repoPath}`, sha: await commit(content), commit };
};

const newProject = async (h: Home, config: string): Promise<string> => {
  const root = join(h.home, `project-${randomName()}`);
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "ponte.toml"), config);
  return root;
};

const gitSkillConfig = (repo: SkillRepo, ref: string): string => skillEntry(repo.url, ref);

const localSkillProject = async (h: Home, name: string): Promise<string> => {
  const root = await newProject(h, skillEntry("skills/on-disk"));
  await h.writeSkill(join(root, "skills", "on-disk"), skillDoc(name));
  return root;
};

describe("project sync", () => {
  it("finds the project from a subdirectory", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await localSkillProject(h, "mine");
    const deep = join(root, "src", "nested");
    await mkdir(deep, { recursive: true });

    const { stdout } = await h.mustRunIn(deep, "sync");

    expect(stdout).toContain(root);
    await h.assertSymlinkTo(h.projectSkillLink(root, "mine"), "../../skills/on-disk");
    await h.close();
  });

  it("names a local link after the frontmatter, not the directory", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await localSkillProject(h, "declared-name");

    await h.mustRunIn(root, "sync");

    await h.assertSymlinkTo(h.projectSkillLink(root, "declared-name"), "../../skills/on-disk");
    await h.assertMissing(h.projectSkillLink(root, "on-disk"));
    await h.close();
  });

  it("vendors a git skill, strips .git, writes the lock and links relatively", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));

    await h.mustRunIn(root, "sync");

    const vendored = h.vendoredSkillPath(root, "git-skill");
    await h.assertFileEquals(join(vendored, "SKILL.md"), skillDoc("git-skill", "# version one\n"));
    expect(await h.exists(join(vendored, ".git"))).toBe(false);
    const lock = await h.readFileText(h.lockPath(root));
    expect(lock).toContain("[skills.git-skill]");
    expect(lock).toContain(repo.sha);
    expect(lock).toContain(repo.url);
    await h.assertSymlinkTo(
      h.projectSkillLink(root, "git-skill"),
      "../../.ponte/sources/git-skill",
    );
    await h.close();
  });

  it("skips the fetch when the lock already matches a vendored copy", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));
    await h.mustRunIn(root, "sync");

    await rm(repo.path, { recursive: true, force: true });
    await rm(join(h.home, ".cache", "ponte"), { recursive: true, force: true });

    const { stdout } = await h.mustRunIn(root, "sync");

    expect(stdout).not.toContain("vendored into");
    await h.assertSymlinkTo(
      h.projectSkillLink(root, "git-skill"),
      "../../.ponte/sources/git-skill",
    );
    await h.close();
  });

  it("never overwrites an edited vendored skill", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const skillFile = join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md");
    await h.writeFile(skillFile, skillDoc("git-skill", "# edited by hand\n"));
    const { stdout } = await h.mustRunIn(root, "sync");

    expect(stdout).not.toContain("vendored into");
    await h.assertFileEquals(skillFile, skillDoc("git-skill", "# edited by hand\n"));
    await h.close();
  });

  it("links a local source outside the project by absolute path", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const outside = h.fixtureDir("simple_skill");
    const root = await newProject(h, skillEntry(outside));

    await h.mustRunIn(root, "sync");

    await h.assertSymlinkTo(h.projectSkillLink(root, "simple-skill"), outside);
    await h.close();
  });

  it("removes a stale link and leaves a real directory alone", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await localSkillProject(h, "mine");
    await h.mustRunIn(root, "sync");

    const handmade = h.projectSkillLink(root, "handmade");
    await h.writeFile(join(handmade, "SKILL.md"), "hand written");
    await symlink("/nowhere", h.projectSkillLink(root, "dropped"));
    await h.writeFile(join(root, "ponte.toml"), "");

    const { stdout } = await h.mustRunIn(root, "sync");

    expect(stdout).toContain("stale link(s) removed");
    await h.assertMissing(h.projectSkillLink(root, "mine"));
    await h.assertMissing(h.projectSkillLink(root, "dropped"));
    await h.assertFileEquals(join(handmade, "SKILL.md"), "hand written");
    await h.close();
  });

  it("does not bootstrap the global config", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await localSkillProject(h, "mine");

    await h.mustRunIn(root, "sync");

    expect(await h.exists(h.configPath("config.toml"))).toBe(false);
    expect(await h.exists(join(h.home, ".config", "ponte"))).toBe(false);
    expect(await h.exists(join(h.home, ".claude"))).toBe(false);
    await h.close();
  });

  it("rejects an unknown top-level key", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, "[vendors.claude-code]\nenabled = true\n");

    const { stderr, exitCode } = await h.runIn(root, "sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("vendors");
    expect(stderr).toContain("unknown key");
    await h.close();
  });

  it("tells the user to migrate a named skill table", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, '[skills.mine]\nsource = "skills/mine"\n');

    const { stderr, exitCode } = await h.runIn(root, "sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("[[skills]]");
    expect(stderr).toContain("SKILL.md");
    await h.close();
  });

  it("rejects a local skill directory with no SKILL.md", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, skillEntry("skills/on-disk"));
    await h.writeFile(join(root, "skills", "on-disk", "notes.md"), "nothing here\n");

    const { stderr, exitCode } = await h.runIn(root, "sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("no SKILL.md");
    await h.close();
  });

  it("rejects a vendored copy whose SKILL.md takes another name", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const skillFile = join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md");
    await h.writeFile(skillFile, skillDoc("renamed-skill", "# version one\n"));

    const { stderr, exitCode } = await h.runIn(root, "sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('declares name "renamed-skill"');
    expect(stderr).toContain('directory is named "git-skill"');
    await h.close();
  });

  it("rejects two entries that declare the same name", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, `${skillEntry("skills/one")}\n${skillEntry("skills/two")}`);
    await h.writeSkill(join(root, "skills", "one"), skillDoc("twin"));
    await h.writeSkill(join(root, "skills", "two"), skillDoc("twin"));

    const { stderr, exitCode } = await h.runIn(root, "sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('two skills declare the name "twin"');
    await h.close();
  });
});

describe("project skills and status", () => {
  it("lists the project skills with their kind and locked commit", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(
      h,
      `${gitSkillConfig(repo, repo.sha)}\n${skillEntry("skills/on-disk")}`,
    );
    await h.writeSkill(join(root, "skills", "on-disk"), skillDoc("mine"));
    await h.mustRunIn(root, "sync");

    const { stdout } = await h.mustRunIn(root, "skills");

    expect(stdout).toContain("git-skill");
    expect(stdout).toContain("mine");
    expect(stdout).toContain("vendored");
    expect(stdout).toContain("local");
    expect(stdout).toContain(repo.sha.slice(0, 7));
    await h.close();
  });

  it("leaves the name unknown for a git skill the lock does not hold", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));

    const { stdout } = await h.mustRunIn(root, "skills");

    expect(stdout).toContain("?");
    await h.close();
  });

  it("reports the link state of the project skills directory", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await localSkillProject(h, "mine");

    const before = await h.mustRunIn(root, "status");
    expect(before.stdout).toContain("not synced");

    await h.mustRunIn(root, "sync");

    const after = await h.mustRunIn(root, "status");
    expect(after.stdout).toContain(join(root, ".agents", "skills"));
    expect(after.stdout).toContain("in sync");
    await h.close();
  });

  it("reports drift while a git skill still waits to be vendored", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(
      h,
      `${gitSkillConfig(repo, repo.sha)}\n${skillEntry("skills/on-disk")}`,
    );
    await h.writeSkill(join(root, "skills", "on-disk"), skillDoc("mine"));
    await h.mustRunIn(root, "sync");

    await rm(h.vendoredSkillPath(root, "git-skill"), { recursive: true, force: true });
    await rm(h.lockPath(root), { force: true });

    const { stdout } = await h.mustRunIn(root, "status");

    expect(stdout).toContain("drifted");
    await h.close();
  });
});

describe("project update", () => {
  it("overwrites a clean copy with the configured ref", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const next = await repo.commit(skillDoc("git-skill", "# version two\n"));
    await h.writeFile(join(root, "ponte.toml"), gitSkillConfig(repo, next));

    const { stdout } = await h.mustRunIn(root, "update", "git-skill");

    expect(stdout).toContain(next.slice(0, 7));
    await h.assertFileEquals(
      join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md"),
      skillDoc("git-skill", "# version two\n"),
    );
    expect(await h.readFileText(h.lockPath(root))).toContain(next);
    await h.close();
  });

  it("refuses an edited copy without --force and obeys --force", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const skillFile = join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md");
    await h.writeFile(skillFile, skillDoc("git-skill", "# edited by hand\n"));

    const refused = await h.runIn(root, "update");
    expect(refused.exitCode).not.toBe(0);
    expect(refused.stderr).toContain("git-skill");
    expect(refused.stderr).toContain("--force");
    await h.assertFileEquals(skillFile, skillDoc("git-skill", "# edited by hand\n"));

    await h.mustRunIn(root, "update", "--force");
    await h.assertFileEquals(skillFile, skillDoc("git-skill", "# version one\n"));
    await h.close();
  });

  it("refuses an update that renames the skill upstream", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const next = await repo.commit(skillDoc("renamed-skill", "# version two\n"));
    await h.writeFile(join(root, "ponte.toml"), gitSkillConfig(repo, next));

    const { stderr, exitCode } = await h.runIn(root, "update", "git-skill");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('declares the name "renamed-skill"');
    expect(stderr).toContain("ponte sync");
    await h.assertFileEquals(
      join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md"),
      skillDoc("git-skill", "# version one\n"),
    );
    await h.close();
  });

  it("vendors the renamed skill on the next sync and drops the old link", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, skillDoc("git-skill", "# version one\n"));
    const root = await newProject(h, gitSkillConfig(repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const next = await repo.commit(skillDoc("renamed-skill", "# version two\n"));
    await h.writeFile(join(root, "ponte.toml"), gitSkillConfig(repo, next));
    await rm(h.vendoredSkillPath(root, "git-skill"), { recursive: true, force: true });

    await h.mustRunIn(root, "sync");

    await h.assertSymlinkTo(
      h.projectSkillLink(root, "renamed-skill"),
      "../../.ponte/sources/renamed-skill",
    );
    await h.assertMissing(h.projectSkillLink(root, "git-skill"));
    const lock = await h.readFileText(h.lockPath(root));
    expect(lock).toContain("[skills.renamed-skill]");
    expect(lock).not.toContain("[skills.git-skill]");
    await h.close();
  });

  it("errors outside a project", async () => {
    if (isWindows()) return;
    const h = await newHarness();

    const { stderr, exitCode } = await h.run("update");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("ponte.toml");
    await h.close();
  });

  it("errors on a skill the lock does not hold", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await localSkillProject(h, "mine");

    const { stderr, exitCode } = await h.runIn(root, "update", "absent");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("absent");
    await h.close();
  });
});
