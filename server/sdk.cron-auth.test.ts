import { COOKIE_NAME } from "@shared/const";
import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";

describe("scheduled task authentication", () => {
  it("recognizes a signed cron session and preserves taskUid", async () => {
    const token = await sdk.signSession({
      openId: "cron_daily_insight_reminder",
      appId: "kaizen-vision",
      name: "Daily insight reminder",
      taskUid: "task_uid_123",
    });
    const req = {
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    } as Request;

    const user = await sdk.authenticateRequest(req);

    expect(user.isCron).toBe(true);
    expect(user.taskUid).toBe("task_uid_123");
    expect(user.openId).toBe("cron_daily_insight_reminder");
  });
});
