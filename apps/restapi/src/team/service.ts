import type { CreateTeam, Team, UpdateTeam } from "./model.ts";
import * as repo from "./repository.ts";

export const listByOrg = async (orgId: string): Promise<Team[]> =>
  repo.findByOrg(orgId);

export const getById = async (
  orgId: string,
  teamId: string,
): Promise<Team | undefined> => repo.findById(orgId, teamId);

export const create = async (data: CreateTeam): Promise<Team> =>
  repo.create(data);

export const update = async (
  orgId: string,
  teamId: string,
  data: UpdateTeam,
): Promise<Team | undefined> => repo.update(orgId, teamId, data);

export const remove = async (orgId: string, teamId: string): Promise<boolean> =>
  repo.remove(orgId, teamId);

export const addMember = async (
  teamId: string,
  userId: string,
): Promise<void> => repo.addMember(teamId, userId);
