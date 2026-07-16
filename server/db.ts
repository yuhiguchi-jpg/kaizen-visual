import { and, asc, desc, eq, gte, like, lt, or, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  improvementCases,
  insightComments,
  insightLikes,
  insightReactions,
  insights,
  InsertImprovementCase,
  InsertInsight,
  InsertUser,
  scheduledJobs,
  scheduledNotificationRuns,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { normalizeStoragePublicUrl } from './storage';
import { calculateAnnualSavedSeconds } from '@shared/improvementTime';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function isConfiguredAdmin(openId: string): boolean {
  if (openId === ENV.ownerOpenId) return true;

  const normalized = openId.startsWith("lark:") ? openId.slice(5) : openId;
  return ENV.larkAdminUserIds
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .some(value => value === openId || value === normalized || `lark:${value}` === openId);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (isConfiguredAdmin(user.openId)) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createInsight(input: InsertInsight) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(insights).values(input);
  return Number(result[0].insertId);
}

export type MissingInsightUser = {
  id: number;
  name: string;
  openId: string;
};

type InsightReminderCandidate = {
  id: number;
  name: string | null;
  openId: string;
  isInsightReminderExcluded: boolean;
};

export function filterMissingInsightUsers(
  userRows: InsightReminderCandidate[],
  submittedUserIds: Set<number>,
): MissingInsightUser[] {
  return userRows
    .filter(row => !row.isInsightReminderExcluded && !submittedUserIds.has(row.id))
    .map(row => ({
      id: row.id,
      name: row.name?.trim() || "名前未設定のメンバー",
      openId: row.openId,
    }));
}

export async function listUsersMissingInsightBetween(
  startUtc: Date,
  endUtc: Date,
): Promise<MissingInsightUser[]> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const [userRows, submittedRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        openId: users.openId,
        isInsightReminderExcluded: users.isInsightReminderExcluded,
      })
      .from(users)
      .where(eq(users.role, "user"))
      .orderBy(asc(users.name)),
    db
      .select({ authorId: insights.authorId })
      .from(insights)
      .where(and(gte(insights.createdAt, startUtc), lt(insights.createdAt, endUtc))),
  ]);

  const submittedUserIds = new Set(submittedRows.map(row => row.authorId));
  return filterMissingInsightUsers(userRows, submittedUserIds);
}

export async function getScheduledJobByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.scheduleCronTaskUid, taskUid))
    .limit(1);
  return rows[0];
}

export async function upsertScheduledJob(jobKey: string, taskUid?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .insert(scheduledJobs)
    .values({ jobKey, scheduleCronTaskUid: taskUid ?? null })
    .onDuplicateKeyUpdate({
      set: {
        ...(taskUid ? { scheduleCronTaskUid: taskUid } : {}),
        updatedAt: new Date(),
      },
    });
}

export async function getScheduledNotificationRun(jobKey: string, businessDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(scheduledNotificationRuns)
    .where(and(
      eq(scheduledNotificationRuns.jobKey, jobKey),
      eq(scheduledNotificationRuns.businessDate, businessDate),
    ))
    .limit(1);
  return rows[0];
}

export async function beginScheduledNotificationRun(jobKey: string, businessDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .insert(scheduledNotificationRuns)
    .values({ jobKey, businessDate, status: "pending" })
    .onDuplicateKeyUpdate({
      set: {
        status: "pending",
        recipientCount: 0,
        messageId: null,
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
}

export async function finishScheduledNotificationRun(input: {
  jobKey: string;
  businessDate: string;
  status: "sent" | "skipped" | "failed";
  recipientCount: number;
  messageId?: string | null;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(scheduledNotificationRuns)
    .set({
      status: input.status,
      recipientCount: input.recipientCount,
      messageId: input.messageId ?? null,
      errorMessage: input.errorMessage ?? null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(scheduledNotificationRuns.jobKey, input.jobKey),
      eq(scheduledNotificationRuns.businessDate, input.businessDate),
    ));
}

export type InsightFilters = {
  genre?: string;
  keyword?: string;
  author?: string;
};

export async function listInsights(viewerId: number, filters: InsightFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const conditions: SQL[] = [];
  if (filters.genre) conditions.push(eq(insights.genre, filters.genre));
  if (filters.keyword) conditions.push(like(insights.content, `%${filters.keyword}%`));
  if (filters.author) conditions.push(like(users.name, `%${filters.author}%`));

  const insightRows = await db
    .select({
      id: insights.id,
      genre: insights.genre,
      content: insights.content,
      createdAt: insights.createdAt,
      authorId: insights.authorId,
      authorName: users.name,
    })
    .from(insights)
    .leftJoin(users, eq(insights.authorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(insights.createdAt));

  const likeRows = await db
    .select({
      insightId: insightLikes.insightId,
      userId: insightLikes.userId,
    })
    .from(insightLikes);

  const commentRows = await db
    .select({ insightId: insightComments.insightId })
    .from(insightComments);

  return insightRows.map(row => {
    const likes = likeRows.filter(likeRow => likeRow.insightId === row.id);
    return {
      ...row,
      authorName: row.authorName || "メンバー",
      likeCount: likes.length,
      likedByMe: likes.some(likeRow => likeRow.userId === viewerId),
      commentCount: commentRows.filter(comment => comment.insightId === row.id).length,
    };
  });
}

export async function insightExists(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ id: insights.id }).from(insights).where(eq(insights.id, id)).limit(1);
  return Boolean(rows[0]);
}

export async function getInsight(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(insights).where(eq(insights.id, id)).limit(1);
  return rows[0];
}

export async function deleteInsight(id: number, authorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(insights).where(and(eq(insights.id, id), eq(insights.authorId, authorId)));
}

export async function toggleInsightLike(insightId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db
    .select({ id: insightLikes.id })
    .from(insightLikes)
    .where(and(
      eq(insightLikes.insightId, insightId),
      eq(insightLikes.userId, userId),
    ))
    .limit(1);

  if (existing[0]) {
    await db.delete(insightLikes).where(eq(insightLikes.id, existing[0].id));
    return { active: false };
  }

  await db.insert(insightLikes).values({ insightId, userId });
  return { active: true };
}

export async function listInsightComments(insightId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({
      id: insightComments.id,
      insightId: insightComments.insightId,
      content: insightComments.content,
      createdAt: insightComments.createdAt,
      updatedAt: insightComments.updatedAt,
      authorId: insightComments.authorId,
      authorName: users.name,
    })
    .from(insightComments)
    .leftJoin(users, eq(insightComments.authorId, users.id))
    .where(eq(insightComments.insightId, insightId))
    .orderBy(asc(insightComments.createdAt));
}

export async function createInsightComment(insightId: number, authorId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(insightComments).values({ insightId, authorId, content });
  return Number(result[0].insertId);
}

export async function getInsightComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(insightComments).where(eq(insightComments.id, id)).limit(1);
  return rows[0];
}

export async function deleteInsightComment(id: number, authorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(insightComments).where(and(
    eq(insightComments.id, id),
    eq(insightComments.authorId, authorId),
  ));
}

export async function createImprovementCase(input: InsertImprovementCase) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(improvementCases).values(input);
  return Number(result[0].insertId);
}

export async function updateImprovementDraft(
  id: number,
  authorId: number,
  input: Pick<InsertImprovementCase, "title" | "workUrl" | "originalMethod" | "problem" | "beforeMinutes" | "beforeSeconds" | "solution" | "afterMinutes" | "afterSeconds" | "frequencyCount" | "frequencyPeriod" | "imagePrompt">,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(improvementCases).set(input).where(and(
    eq(improvementCases.id, id),
    eq(improvementCases.authorId, authorId),
    eq(improvementCases.status, "draft"),
  ));
}

export async function getImprovementCase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(improvementCases).where(eq(improvementCases.id, id)).limit(1);
  return rows[0];
}

export async function saveGeneratedImprovementImage(id: number, imageUrl: string, imagePrompt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(improvementCases).set({ imageUrl, imagePrompt, generatedAt: new Date() }).where(eq(improvementCases.id, id));
}

export async function publishImprovementCase(id: number, authorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(improvementCases).set({ status: "published", publishedAt: new Date() }).where(and(
    eq(improvementCases.id, id),
    eq(improvementCases.authorId, authorId),
  ));
}

export async function deleteImprovementCase(id: number, authorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(improvementCases).where(and(
    eq(improvementCases.id, id),
    eq(improvementCases.authorId, authorId),
  ));
}

export async function listPublishedImprovementCases(query?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const normalizedQuery = query?.trim();
  const searchCondition = normalizedQuery
    ? or(
      like(improvementCases.title, `%${normalizedQuery}%`),
      like(users.name, `%${normalizedQuery}%`),
      like(improvementCases.originalMethod, `%${normalizedQuery}%`),
      like(improvementCases.problem, `%${normalizedQuery}%`),
      like(improvementCases.solution, `%${normalizedQuery}%`),
      like(improvementCases.workUrl, `%${normalizedQuery}%`),
    )
    : undefined;

  const rows = await db
    .select({
      id: improvementCases.id,
      authorId: improvementCases.authorId,
      title: improvementCases.title,
      workUrl: improvementCases.workUrl,
      originalMethod: improvementCases.originalMethod,
      problem: improvementCases.problem,
      beforeMinutes: improvementCases.beforeMinutes,
      beforeSeconds: improvementCases.beforeSeconds,
      solution: improvementCases.solution,
      afterMinutes: improvementCases.afterMinutes,
      afterSeconds: improvementCases.afterSeconds,
      frequencyCount: improvementCases.frequencyCount,
      frequencyPeriod: improvementCases.frequencyPeriod,
      imageUrl: improvementCases.imageUrl,
      publishedAt: improvementCases.publishedAt,
      authorName: users.name,
    })
    .from(improvementCases)
    .leftJoin(users, eq(improvementCases.authorId, users.id))
    .where(and(eq(improvementCases.status, "published"), searchCondition))
    .orderBy(desc(improvementCases.publishedAt));

  return rows.map(row => ({
    ...row,
    imageUrl: normalizeStoragePublicUrl(row.imageUrl),
    annualSavedSeconds: calculateAnnualSavedSeconds({
      beforeSeconds: row.beforeSeconds,
      afterSeconds: row.afterSeconds,
      frequencyCount: row.frequencyCount,
      frequencyPeriod: row.frequencyPeriod,
    }),
  }));
}

export async function getKnowledgeStats() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const insightRows = await db.select({ id: insights.id }).from(insights);
  const improvementRows = await db.select({
    beforeSeconds: improvementCases.beforeSeconds,
    afterSeconds: improvementCases.afterSeconds,
    frequencyCount: improvementCases.frequencyCount,
    frequencyPeriod: improvementCases.frequencyPeriod,
  }).from(improvementCases).where(eq(improvementCases.status, "published"));

  return {
    insightCount: insightRows.length,
    improvementCount: improvementRows.length,
    annualSavedSeconds: improvementRows.reduce((total, item) => total + calculateAnnualSavedSeconds(item), 0),
  };
}
