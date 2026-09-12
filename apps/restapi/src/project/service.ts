import type { CreateProject, Project, UpdateProject } from "./model.ts";
import * as repo from "./repository.ts";

export const listByOrg = async (orgId: string): Promise<Project[]> =>
  repo.findByOrg(orgId);

export const getById = async (
  orgId: string,
  projectId: string,
): Promise<Project | undefined> => repo.findById(orgId, projectId);

export const create = async (data: CreateProject): Promise<Project> =>
  repo.create(data);

export const update = async (
  orgId: string,
  projectId: string,
  data: UpdateProject,
): Promise<Project | undefined> => repo.update(orgId, projectId, data);

export const remove = async (
  orgId: string,
  projectId: string,
): Promise<boolean> => repo.remove(orgId, projectId);
