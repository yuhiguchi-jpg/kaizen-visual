import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createInsight: vi.fn(),
  createInsightComment: vi.fn(),
  deleteInsight: vi.fn(),
  deleteInsightComment: vi.fn(),
  getInsight: vi.fn(),
  getInsightComment: vi.fn(),
  insightExists: vi.fn(),
  listInsightComments: vi.fn(),
  listInsights: vi.fn(),
  toggleInsightLike: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { insightsRouter } from "./routers/insights";

function createContext(userId = 12): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user-${userId}@example.com`,
      name: "テスト 利用者",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("insights like and comment routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.insightExists.mockResolvedValue(true);
  });

  it("toggles a like for the signed-in user", async () => {
    dbMocks.toggleInsightLike.mockResolvedValue({ active: true });
    const result = await insightsRouter.createCaller(createContext()).toggleLike({ insightId: 7 });
    expect(result).toEqual({ active: true });
    expect(dbMocks.toggleInsightLike).toHaveBeenCalledWith(7, 12);
  });

  it("returns NOT_FOUND when liking a missing insight", async () => {
    dbMocks.insightExists.mockResolvedValue(false);
    await expect(insightsRouter.createCaller(createContext()).toggleLike({ insightId: 404 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.toggleInsightLike).not.toHaveBeenCalled();
  });

  it("lists comments and supplies a fallback author name", async () => {
    const createdAt = new Date();
    dbMocks.listInsightComments.mockResolvedValue([
      { id: 3, insightId: 7, authorId: 22, authorName: null, content: "参考になります", createdAt, updatedAt: createdAt },
    ]);
    const result = await insightsRouter.createCaller(createContext()).comments({ insightId: 7 });
    expect(result[0]).toMatchObject({ id: 3, authorName: "メンバー", content: "参考になります" });
  });

  it("creates a trimmed comment for the signed-in user", async () => {
    dbMocks.createInsightComment.mockResolvedValue(31);
    const result = await insightsRouter.createCaller(createContext()).addComment({ insightId: 7, content: " 参考になりました " });
    expect(result).toEqual({ id: 31 });
    expect(dbMocks.createInsightComment).toHaveBeenCalledWith(7, 12, "参考になりました");
  });

  it("rejects empty and over-500-character comments", async () => {
    const caller = insightsRouter.createCaller(createContext());
    await expect(caller.addComment({ insightId: 7, content: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.addComment({ insightId: 7, content: "あ".repeat(501) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createInsightComment).not.toHaveBeenCalled();
  });

  it("rejects deleting another user's comment", async () => {
    dbMocks.getInsightComment.mockResolvedValue({ id: 9, insightId: 7, authorId: 99, content: "他人のコメント" });
    await expect(insightsRouter.createCaller(createContext()).deleteComment({ id: 9 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.deleteInsightComment).not.toHaveBeenCalled();
  });

  it("deletes the signed-in user's own comment", async () => {
    dbMocks.getInsightComment.mockResolvedValue({ id: 9, insightId: 7, authorId: 12, content: "自分のコメント" });
    const result = await insightsRouter.createCaller(createContext()).deleteComment({ id: 9 });
    expect(result).toEqual({ success: true });
    expect(dbMocks.deleteInsightComment).toHaveBeenCalledWith(9, 12);
  });
});
