export type Project = {
  readonly id: string;
  readonly orgId: string;
  readonly teamId: string | null;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateProject = {
  readonly orgId: string;
  readonly name: string;
  readonly teamId?: string;
};

export type UpdateProject = {
  readonly name?: string;
  readonly teamId?: string | null;
};
