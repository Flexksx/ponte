import type {
  CreateOrganization,
  Organization,
  OrganizationWithRole,
  UpdateOrganization,
} from "./model.ts";
import * as repo from "./repository.ts";

export const listForUser = async (
  userId: string,
): Promise<OrganizationWithRole[]> => repo.findByUser(userId);

export const getById = async (id: string): Promise<Organization | undefined> =>
  repo.findById(id);

export const createWithOwner = async (
  data: CreateOrganization,
  ownerId: string,
): Promise<Organization> => {
  const org = await repo.create(data);
  await repo.addOwner(org.id, ownerId);
  return org;
};

export const update = async (
  id: string,
  data: UpdateOrganization,
): Promise<Organization | undefined> => repo.update(id, data);

export const remove = async (id: string): Promise<boolean> => repo.remove(id);
