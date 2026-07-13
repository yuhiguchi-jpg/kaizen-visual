import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getInsight: vi.fn(),
    deleteInsight: vi.fn(),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user-${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("insights.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes an insight owned by the signed-in user", async () => {
    vi.mocked(db.getInsight).mockResolvedValue({ id: 7, authorId: 12 } as Awaited<ReturnType<typeof db.getInsight>>);
    const caller = appRouter.createCaller(createAuthContext(12));

    await expect(caller.insights.delete({ id: 7 })).resolves.toEqual({ success: true });
    expect(db.deleteInsight).toHaveBeenCalledWith(7, 12);
  });

  it("hides non-owned and missing insights behind NOT_FOUND", async () => {
    const caller = appRouter.createCaller(createAuthContext(12));

    vi.mocked(db.getInsight).mockResolvedValueOnce({ id: 7, authorId: 99 } as Awaited<ReturnType<typeof db.getInsight>>);
    await expect(caller.insights.delete({ id: 7 })).rejects.toMatchObject({ code: "NOT_FOUND" });

    vi.mocked(db.getInsight).mockResolvedValueOnce(undefined);
    await expect(caller.insights.delete({ id: 8 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.deleteInsight).not.toHaveBeenCalled();
  });
});
