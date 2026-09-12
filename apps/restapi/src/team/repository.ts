import { and, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { teamMembers, teams } from "../db/schema.ts";
import { toTeam } from "./mapper.ts";
import type { CreateTeam, Team, UpdateTeam } from "./model.ts";

export const findByOrg = async (orgId: string): Promise<Team[]> => {
  const rows = await db.select().from(teams).where(eq(teams.orgId, orgId));
  return rows.map(toTeam);
};

export const findById = async (
  orgId: string,
  teamId: string,
): Promise<Team | undefined> => {
  const [row] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)));
  return row ? toTeam(row) : undefined;
};

export const create = async (data: CreateTeam): Promise<Team> => {
  const rows = await db.insert(teams).values(data).returning();
  return toTeam(rows[0] as (typeof rows)[0]);
};

export const update = async (
  orgId: string,
  teamId: string,
  data: UpdateTeam,
): Promise<Team | undefined> => {
  const [row] = await db
    .update(teams)
    .set(data)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)))
    .returning();
  return row ? toTeam(row) : undefined;
};

export const remove = async (
  orgId: string,
  teamId: string,
): Promise<boolean> => {
  const [row] = await db
    .delete(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)))
    .returning();
  return row !== undefined;
};

export const addMember = async (
  teamId: string,
  userId: string,
): Promise<void> => {
  await db.insert(teamMembers).values({ teamId, userId });
};
