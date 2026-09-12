export type Capability = {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type Skill = {
  readonly id: string;
  readonly capabilityId: string;
  readonly name: string;
  readonly source: string;
  readonly ref: string | null;
  readonly subdir: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type Subagent = {
  readonly id: string;
  readonly capabilityId: string;
  readonly name: string;
  readonly source: string;
  readonly ref: string | null;
  readonly subdir: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type McpServer = {
  readonly id: string;
  readonly capabilityId: string;
  readonly name: string;
  readonly url: string;
  readonly config: unknown | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CapabilityDetail = Capability & {
  readonly skills: readonly Skill[];
  readonly subagents: readonly Subagent[];
  readonly mcpServers: readonly McpServer[];
};

export type CreateCapability = {
  readonly name: string;
  readonly description?: string;
};

export type CreateSkill = {
  readonly capabilityId: string;
  readonly name: string;
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type CreateSubagent = {
  readonly capabilityId: string;
  readonly name: string;
  readonly source: string;
  readonly ref?: string;
  readonly subdir?: string;
};

export type CreateMcpServer = {
  readonly capabilityId: string;
  readonly name: string;
  readonly url: string;
  readonly config?: Record<string, unknown>;
};
