import type { Organization } from "./model.ts";

export const toOrganization = (row: {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}): Organization => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
