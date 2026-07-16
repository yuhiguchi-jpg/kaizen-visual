import type { Request, Response } from "express";
import * as db from "../db";
import {
  DAILY_INSIGHT_REMINDER_JOB_KEY,
  runDailyInsightReminder,
} from "../dailyInsightReminder";
import { sdk } from "../_core/sdk";

export async function dailyInsightReminderHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    taskUid = user.taskUid;
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const scheduledJob = await db.getScheduledJobByTaskUid(user.taskUid);
    if (!scheduledJob) {
      return res.json({ ok: true, skipped: "orphan" });
    }
    if (scheduledJob.jobKey !== DAILY_INSIGHT_REMINDER_JOB_KEY) {
      return res.status(403).json({ error: "wrong-job" });
    }

    const result = await runDailyInsightReminder();
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return res.status(500).json({
      error: message,
      stack,
      context: {
        url: req.originalUrl,
        taskUid,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
