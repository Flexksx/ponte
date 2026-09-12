import type { Project } from "./model.ts";

export const toProject = (row: {
  id: string;
  orgId: string;
  teamId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): Project => ({
  id: row.id,
  orgId: row.orgId,
  teamId: row.teamId,
  name: row.name,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
