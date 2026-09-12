import { and, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import {
  capabilities,
  mcpServers,
  skills,
  subagents,
  teamCapabilities,
} from "../db/schema.ts";
import { toCapability, toMcpServer, toSkill, toSubagent } from "./mapper.ts";
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

export const findByOrg = async (orgId: string): Promise<Capability[]> => {
  const rows = await db
    .select()
    .from(capabilities)
    .where(eq(capabilities.orgId, orgId));
  return rows.map(toCapability);
};

export const findById = async (
  orgId: string,
  capId: string,
): Promise<Capability | undefined> => {
  const [row] = await db
    .select()
    .from(capabilities)
    .where(and(eq(capabilities.id, capId), eq(capabilities.orgId, orgId)));
  return row ? toCapability(row) : undefined;
};

export const findDetailById = async (
  orgId: string,
  capId: string,
): Promise<CapabilityDetail | undefined> => {
  const cap = await findById(orgId, capId);
  if (!cap) {
    return undefined;
  }
  const [capSkills, capSubagents, capMcpServers] = await Promise.all([
    db.select().from(skills).where(eq(skills.capabilityId, capId)),
    db.select().from(subagents).where(eq(subagents.capabilityId, capId)),
    db.select().from(mcpServers).where(eq(mcpServers.capabilityId, capId)),
  ]);
  return {
    ...cap,
    skills: capSkills.map(toSkill),
    subagents: capSubagents.map(toSubagent),
    mcpServers: capMcpServers.map(toMcpServer),
  };
};

export const create = async (
  orgId: string,
  data: CreateCapability,
): Promise<Capability> => {
  const rows = await db
    .insert(capabilities)
    .values({
      orgId,
      name: data.name,
      description: data.description ?? null,
    })
    .returning();
  return toCapability(rows[0] as (typeof rows)[0]);
};

export const remove = async (
  orgId: string,
  capId: string,
): Promise<boolean> => {
  const [row] = await db
    .delete(capabilities)
    .where(and(eq(capabilities.id, capId), eq(capabilities.orgId, orgId)))
    .returning();
  return row !== undefined;
};

export const assignToTeam = async (
  teamId: string,
  capabilityId: string,
): Promise<void> => {
  await db.insert(teamCapabilities).values({ teamId, capabilityId });
};

export const findByTeam = async (teamId: string): Promise<Capability[]> => {
  const rows = await db
    .select({ capability: capabilities })
    .from(teamCapabilities)
    .innerJoin(capabilities, eq(teamCapabilities.capabilityId, capabilities.id))
    .where(eq(teamCapabilities.teamId, teamId));
  return rows.map(r => toCapability(r.capability));
};

export const addSkill = async (data: CreateSkill): Promise<Skill> => {
  const rows = await db
    .insert(skills)
    .values({
      capabilityId: data.capabilityId,
      name: data.name,
      source: data.source,
      ref: data.ref ?? null,
      subdir: data.subdir ?? null,
    })
    .returning();
  return toSkill(rows[0] as (typeof rows)[0]);
};

export const addSubagent = async (data: CreateSubagent): Promise<Subagent> => {
  const rows = await db
    .insert(subagents)
    .values({
      capabilityId: data.capabilityId,
      name: data.name,
      source: data.source,
      ref: data.ref ?? null,
      subdir: data.subdir ?? null,
    })
    .returning();
  return toSubagent(rows[0] as (typeof rows)[0]);
};

export const addMcpServer = async (
  data: CreateMcpServer,
): Promise<McpServer> => {
  const rows = await db
    .insert(mcpServers)
    .values({
      capabilityId: data.capabilityId,
      name: data.name,
      url: data.url,
      config: data.config ?? null,
    })
    .returning();
  return toMcpServer(rows[0] as (typeof rows)[0]);
};
