import { eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { organizations, orgMembers } from "../db/schema.ts";
import { toOrganization } from "./mapper.ts";
import type {
  CreateOrganization,
  Organization,
  OrganizationWithRole,
  UpdateOrganization,
} from "./model.ts";

export const findByUser = async (
  userId: string,
): Promise<OrganizationWithRole[]> => {
  const rows = await db
    .select({ org: organizations, membership: orgMembers })
    .from(organizations)
    .innerJoin(orgMembers, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId));
  return rows.map(r => ({
    ...toOrganization(r.org),
    role: r.membership.role,
  }));
};

export const findById = async (
  id: string,
): Promise<Organization | undefined> => {
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id));
  return row ? toOrganization(row) : undefined;
};

export const create = async (
  data: CreateOrganization,
): Promise<Organization> => {
  const rows = await db.insert(organizations).values(data).returning();
  return toOrganization(rows[0] as (typeof rows)[0]);
};

export const addOwner = async (
  orgId: string,
  userId: string,
): Promise<void> => {
  await db.insert(orgMembers).values({ orgId, userId, role: "owner" });
};

export const update = async (
  id: string,
  data: UpdateOrganization,
): Promise<Organization | undefined> => {
  const [row] = await db
    .update(organizations)
    .set(data)
    .where(eq(organizations.id, id))
    .returning();
  return row ? toOrganization(row) : undefined;
};

export const remove = async (id: string): Promise<boolean> => {
  const [row] = await db
    .delete(organizations)
    .where(eq(organizations.id, id))
    .returning();
  return row !== undefined;
};
