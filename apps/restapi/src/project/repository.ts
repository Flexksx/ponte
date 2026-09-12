import { and, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { projects } from "../db/schema.ts";
import { toProject } from "./mapper.ts";
import type { CreateProject, Project, UpdateProject } from "./model.ts";

export const findByOrg = async (orgId: string): Promise<Project[]> => {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId));
  return rows.map(toProject);
};

export const findById = async (
  orgId: string,
  projectId: string,
): Promise<Project | undefined> => {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  return row ? toProject(row) : undefined;
};

export const create = async (data: CreateProject): Promise<Project> => {
  const rows = await db
    .insert(projects)
    .values({
      orgId: data.orgId,
      name: data.name,
      teamId: data.teamId ?? null,
    })
    .returning();
  return toProject(rows[0] as (typeof rows)[0]);
};

export const update = async (
  orgId: string,
  projectId: string,
  data: UpdateProject,
): Promise<Project | undefined> => {
  const [row] = await db
    .update(projects)
    .set(data)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .returning();
  return row ? toProject(row) : undefined;
};

export const remove = async (
  orgId: string,
  projectId: string,
): Promise<boolean> => {
  const [row] = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .returning();
  return row !== undefined;
};
