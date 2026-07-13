import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insights = mysqlTable("insights", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  genre: varchar("genre", { length: 64 }).default("業務プロセス改善").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("insights_author_idx").on(table.authorId),
  index("insights_genre_idx").on(table.genre),
  index("insights_created_idx").on(table.createdAt),
]);

export const insightReactions = mysqlTable("insight_reactions", {
  id: int("id").autoincrement().primaryKey(),
  insightId: int("insightId").notNull().references(() => insights.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reaction: mysqlEnum("reaction", ["spark", "agree", "thanks", "idea"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("insight_reaction_unique").on(table.insightId, table.userId, table.reaction),
  index("insight_reactions_insight_idx").on(table.insightId),
  index("insight_reactions_user_idx").on(table.userId),
]);

export const insightLikes = mysqlTable("insight_likes", {
  id: int("id").autoincrement().primaryKey(),
  insightId: int("insightId").notNull().references(() => insights.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("insight_like_unique").on(table.insightId, table.userId),
  index("insight_likes_insight_idx").on(table.insightId),
  index("insight_likes_user_idx").on(table.userId),
]);

export const insightComments = mysqlTable("insight_comments", {
  id: int("id").autoincrement().primaryKey(),
  insightId: int("insightId").notNull().references(() => insights.id, { onDelete: "cascade" }),
  authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("insight_comments_insight_idx").on(table.insightId),
  index("insight_comments_author_idx").on(table.authorId),
  index("insight_comments_created_idx").on(table.createdAt),
]);

export const improvementCases = mysqlTable("improvement_cases", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).default("改善事例").notNull(),
  workUrl: text("workUrl"),
  originalMethod: text("originalMethod").notNull(),
  problem: text("problem").notNull(),
  beforeMinutes: int("beforeMinutes").notNull(),
  beforeSeconds: int("beforeSeconds").default(0).notNull(),
  solution: text("solution").notNull(),
  afterMinutes: int("afterMinutes").notNull(),
  afterSeconds: int("afterSeconds").default(0).notNull(),
  frequencyCount: int("frequencyCount").default(1).notNull(),
  frequencyPeriod: mysqlEnum("frequencyPeriod", ["day", "week", "month", "year"]).default("year").notNull(),
  imageUrl: text("imageUrl"),
  imagePrompt: text("imagePrompt"),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  generatedAt: timestamp("generatedAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("improvement_cases_author_idx").on(table.authorId),
  index("improvement_cases_status_idx").on(table.status),
  index("improvement_cases_published_idx").on(table.publishedAt),
]);

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = typeof insights.$inferInsert;
export type InsightComment = typeof insightComments.$inferSelect;
export type InsertInsightComment = typeof insightComments.$inferInsert;
export type ImprovementCase = typeof improvementCases.$inferSelect;
export type InsertImprovementCase = typeof improvementCases.$inferInsert;
