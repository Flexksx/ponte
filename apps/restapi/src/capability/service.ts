import type {
  Capability,
  CapabilityDetail,
  CreateCapability,
  CreateMcpServer,
  CreateSkill,
  CreateSubagent,
  McpServer,
  Skill,
  Subagent,
} from "./model.ts";
import * as repo from "./repository.ts";

export const listByOrg = async (orgId: string): Promise<Capability[]> =>
  repo.findByOrg(orgId);

export const getById = async (
  orgId: string,
  capId: string,
): Promise<Capability | undefined> => repo.findById(orgId, capId);

export const getDetail = async (
  orgId: string,
  capId: string,
): Promise<CapabilityDetail | undefined> => repo.findDetailById(orgId, capId);

export const create = async (
  orgId: string,
  data: CreateCapability,
): Promise<Capability> => repo.create(orgId, data);

export const remove = async (orgId: string, capId: string): Promise<boolean> =>
  repo.remove(orgId, capId);

export const assignToTeam = async (
  teamId: string,
  capabilityId: string,
): Promise<void> => repo.assignToTeam(teamId, capabilityId);

export const listByTeam = async (teamId: string): Promise<Capability[]> =>
  repo.findByTeam(teamId);

export const addSkill = async (data: CreateSkill): Promise<Skill> =>
  repo.addSkill(data);

export const addSubagent = async (data: CreateSubagent): Promise<Subagent> =>
  repo.addSubagent(data);

export const addMcpServer = async (data: CreateMcpServer): Promise<McpServer> =>
  repo.addMcpServer(data);
