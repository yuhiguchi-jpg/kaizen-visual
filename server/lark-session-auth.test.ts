import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

import * as db from "./db";
import { sdk } from "./_core/sdk";

describe("Lark session request authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not authenticate an Authorization Bearer token without the session cookie", async () => {
    const token = await sdk.createSessionToken("lark:ou_test", {
      name: "Test User",
    });
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;

    await expect(sdk.authenticateRequest(request)).rejects.toThrow(
      "Invalid Lark session"
    );
    expect(db.getUserByOpenId).not.toHaveBeenCalled();
  });
});
