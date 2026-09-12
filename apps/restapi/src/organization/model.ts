export type Organization = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type OrganizationWithRole = Organization & {
  readonly role: string;
};

export type CreateOrganization = {
  readonly name: string;
  readonly slug: string;
};

export type UpdateOrganization = {
  readonly name?: string;
  readonly slug?: string;
};
