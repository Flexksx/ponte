import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

// ── Auth (better-auth managed) ──────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  ...timestamps,
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

// ── Organizations ───────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    ...timestamps,
  },
  table => [primaryKey({ columns: [table.orgId, table.userId] })],
);

// ── Teams ───────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ...timestamps,
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  table => [primaryKey({ columns: [table.teamId, table.userId] })],
);

// ── Projects ────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  ...timestamps,
});

// ── Capabilities ────────────────────────────────────────────────────

export const capabilities = pgTable("capabilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

export const teamCapabilities = pgTable(
  "team_capabilities",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    capabilityId: uuid("capability_id")
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  table => [primaryKey({ columns: [table.teamId, table.capabilityId] })],
);

// ── Capability items ────────────────────────────────────────────────

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  capabilityId: uuid("capability_id")
    .notNull()
    .references(() => capabilities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  source: text("source").notNull(),
  ref: text("ref"),
  subdir: text("subdir"),
  ...timestamps,
});

export const subagents = pgTable("subagents", {
  id: uuid("id").defaultRandom().primaryKey(),
  capabilityId: uuid("capability_id")
    .notNull()
    .references(() => capabilities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  source: text("source").notNull(),
  ref: text("ref"),
  subdir: text("subdir"),
  ...timestamps,
});

export const mcpServers = pgTable("mcp_servers", {
  id: uuid("id").defaultRandom().primaryKey(),
  capabilityId: uuid("capability_id")
    .notNull()
    .references(() => capabilities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  config: jsonb("config"),
  ...timestamps,
});
