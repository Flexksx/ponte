export type Team = {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateTeam = {
  readonly orgId: string;
  readonly name: string;
};

export type UpdateTeam = {
  readonly name?: string;
};
