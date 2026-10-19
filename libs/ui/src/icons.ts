import ArrowRight from "@tabler/icons-svelte-runes/icons/arrow-right";
import BrandGithub from "@tabler/icons-svelte-runes/icons/brand-github";
import BrandJira from "@tabler/icons-svelte-runes/icons/brand-jira";
import BrandSlack from "@tabler/icons-svelte-runes/icons/brand-slack";
import CircleCheck from "@tabler/icons-svelte-runes/icons/circle-check";
import CircleX from "@tabler/icons-svelte-runes/icons/circle-x";
import Clock from "@tabler/icons-svelte-runes/icons/clock";
import FileText from "@tabler/icons-svelte-runes/icons/file-text";
import Folder from "@tabler/icons-svelte-runes/icons/folder";
import Gavel from "@tabler/icons-svelte-runes/icons/gavel";
import GitMerge from "@tabler/icons-svelte-runes/icons/git-merge";
import GitPullRequest from "@tabler/icons-svelte-runes/icons/git-pull-request";
import GitPullRequestClosed from "@tabler/icons-svelte-runes/icons/git-pull-request-closed";
import GitPullRequestDraft from "@tabler/icons-svelte-runes/icons/git-pull-request-draft";
import History from "@tabler/icons-svelte-runes/icons/history";
import MathPi from "@tabler/icons-svelte-runes/icons/math-pi";
import Puzzle from "@tabler/icons-svelte-runes/icons/puzzle";
import Robot from "@tabler/icons-svelte-runes/icons/robot";
import SettingsAutomation from "@tabler/icons-svelte-runes/icons/settings-automation";
import UsersGroup from "@tabler/icons-svelte-runes/icons/users-group";
import World from "@tabler/icons-svelte-runes/icons/world";
import { siClaudecode } from "simple-icons";

type GlyphName = keyof typeof GLYPHS;

type LogoName = keyof typeof LOGOS;

export type IconName = GlyphName | LogoName;

export const GLYPHS = {
  github: BrandGithub,
  slack: BrandSlack,
  jira: BrandJira,
  folder: Folder,
  world: World,
  workflow: SettingsAutomation,
  pullRequest: GitPullRequest,
  pullRequestDraft: GitPullRequestDraft,
  pullRequestClosed: GitPullRequestClosed,
  merged: GitMerge,
  passed: CircleCheck,
  failed: CircleX,
  pending: Clock,
  decision: Gavel,
  next: ArrowRight,
  sessions: History,
  pi: MathPi,
  agents: Robot,
  prompt: FileText,
  skills: Puzzle,
  subagents: UsersGroup,
};

export const LOGOS = {
  claudeCode: siClaudecode,
};

export const isGlyph = (name: IconName): name is GlyphName => name in GLYPHS;
