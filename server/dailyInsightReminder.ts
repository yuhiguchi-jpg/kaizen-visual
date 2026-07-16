import * as db from "./db";
import { ENV } from "./_core/env";
import { sendLarkTextMessage } from "./larkMessaging";

export const DAILY_INSIGHT_REMINDER_JOB_KEY = "daily-insight-reminder";

export type TokyoBusinessDay = {
  businessDate: string;
  displayDate: string;
  weekday: number;
  startUtc: Date;
  endUtc: Date;
};

export function getTokyoBusinessDay(now: Date): TokyoBusinessDay {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? "";
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const businessDate = `${year}-${month}-${day}`;
  const startUtc = new Date(`${businessDate}T00:00:00+09:00`);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  const weekday = new Date(`${businessDate}T12:00:00+09:00`).getUTCDay();

  return {
    businessDate,
    displayDate: `${year}/${month}/${day}`,
    weekday,
    startUtc,
    endUtc,
  };
}

export function formatMissingInsightMessage(
  displayDate: string,
  users: db.MissingInsightUser[],
): string {
  const userLines = users.map(user => `・${user.name}`).join("\n");
  return [
    `【気づき入力リマインド｜${displayDate}】`,
    "",
    "本日17:30時点で、気づきが未入力の方は以下です。",
    userLines,
    "",
    "本日の気づきをKAIZEN VISIONへ入力してください。",
  ].join("\n");
}

export async function runDailyInsightReminder(now = new Date()) {
  const day = getTokyoBusinessDay(now);
  if (day.weekday === 0 || day.weekday === 6) {
    return { ok: true as const, skipped: "weekend" as const, businessDate: day.businessDate };
  }

  const previousRun = await db.getScheduledNotificationRun(
    DAILY_INSIGHT_REMINDER_JOB_KEY,
    day.businessDate,
  );
  if (previousRun?.status === "sent" || previousRun?.status === "skipped") {
    return {
      ok: true as const,
      skipped: "already-completed" as const,
      businessDate: day.businessDate,
      recipientCount: previousRun.recipientCount,
    };
  }
  if (
    previousRun?.status === "pending" &&
    now.getTime() - previousRun.updatedAt.getTime() < 10 * 60 * 1000
  ) {
    return {
      ok: true as const,
      skipped: "in-progress" as const,
      businessDate: day.businessDate,
      recipientCount: previousRun.recipientCount,
    };
  }

  await db.beginScheduledNotificationRun(
    DAILY_INSIGHT_REMINDER_JOB_KEY,
    day.businessDate,
  );

  try {
    const missingUsers = await db.listUsersMissingInsightBetween(day.startUtc, day.endUtc);
    if (missingUsers.length === 0) {
      await db.finishScheduledNotificationRun({
        jobKey: DAILY_INSIGHT_REMINDER_JOB_KEY,
        businessDate: day.businessDate,
        status: "skipped",
        recipientCount: 0,
      });
      return {
        ok: true as const,
        skipped: "no-missing-users" as const,
        businessDate: day.businessDate,
        recipientCount: 0,
      };
    }

    const result = await sendLarkTextMessage({
      chatId: ENV.larkDailyInsightChatId,
      text: formatMissingInsightMessage(day.displayDate, missingUsers),
    });
    await db.finishScheduledNotificationRun({
      jobKey: DAILY_INSIGHT_REMINDER_JOB_KEY,
      businessDate: day.businessDate,
      status: "sent",
      recipientCount: missingUsers.length,
      messageId: result.messageId,
    });
    return {
      ok: true as const,
      businessDate: day.businessDate,
      recipientCount: missingUsers.length,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await db.finishScheduledNotificationRun({
      jobKey: DAILY_INSIGHT_REMINDER_JOB_KEY,
      businessDate: day.businessDate,
      status: "failed",
      recipientCount: 0,
      errorMessage,
    });
    throw error;
  }
}
