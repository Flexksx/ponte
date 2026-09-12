import type { Capability, McpServer, Skill, Subagent } from "./model.ts";

export const toCapability = (row: {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Capability => ({
  id: row.id,
  orgId: row.orgId,
  name: row.name,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toSkill = (row: {
  id: string;
  capabilityId: string;
  name: string;
  source: string;
  ref: string | null;
  subdir: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Skill => ({
  id: row.id,
  capabilityId: row.capabilityId,
  name: row.name,
  source: row.source,
  ref: row.ref,
  subdir: row.subdir,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toSubagent = (row: {
  id: string;
  capabilityId: string;
  name: string;
  source: string;
  ref: string | null;
  subdir: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Subagent => ({
  id: row.id,
  capabilityId: row.capabilityId,
  name: row.name,
  source: row.source,
  ref: row.ref,
  subdir: row.subdir,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toMcpServer = (row: {
  id: string;
  capabilityId: string;
  name: string;
  url: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}): McpServer => ({
  id: row.id,
  capabilityId: row.capabilityId,
  name: row.name,
  url: row.url,
  config: row.config,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
