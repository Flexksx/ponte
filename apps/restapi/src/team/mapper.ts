import type { Team } from "./model.ts";

export const toTeam = (row: {
  id: string;
  orgId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): Team => ({
  id: row.id,
  orgId: row.orgId,
  name: row.name,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
