import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getScheduledNotificationRun: vi.fn(),
  beginScheduledNotificationRun: vi.fn(),
  listUsersMissingInsightBetween: vi.fn(),
  finishScheduledNotificationRun: vi.fn(),
}));

vi.mock("./larkMessaging", () => ({
  sendLarkTextMessage: vi.fn(),
}));

import * as db from "./db";
import {
  DAILY_INSIGHT_REMINDER_JOB_KEY,
  formatMissingInsightMessage,
  getTokyoBusinessDay,
  runDailyInsightReminder,
} from "./dailyInsightReminder";
import { sendLarkTextMessage } from "./larkMessaging";

const mockDb = vi.mocked(db);
const mockSendLarkTextMessage = vi.mocked(sendLarkTextMessage);

describe("dailyInsightReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.getScheduledNotificationRun.mockResolvedValue(undefined);
    mockDb.beginScheduledNotificationRun.mockResolvedValue(undefined);
    mockDb.finishScheduledNotificationRun.mockResolvedValue(undefined);
  });

  it("calculates the Tokyo business date and UTC boundaries", () => {
    const day = getTokyoBusinessDay(new Date("2026-07-15T15:30:00.000Z"));

    expect(day.businessDate).toBe("2026-07-16");
    expect(day.displayDate).toBe("2026/07/16");
    expect(day.weekday).toBe(4);
    expect(day.startUtc.toISOString()).toBe("2026-07-15T15:00:00.000Z");
    expect(day.endUtc.toISOString()).toBe("2026-07-16T15:00:00.000Z");
  });

  it("formats a readable Japanese reminder", () => {
    const message = formatMissingInsightMessage("2026/07/16", [
      { id: 1, name: "田中 太郎", openId: "lark:ou_1" },
      { id: 2, name: "佐藤 花子", openId: "lark:ou_2" },
    ]);

    expect(message).toContain("【気づき入力リマインド｜2026/07/16】");
    expect(message).toContain("・田中 太郎");
    expect(message).toContain("・佐藤 花子");
  });

  it("skips weekends without touching the database", async () => {
    const result = await runDailyInsightReminder(
      new Date("2026-07-18T08:30:00.000Z"),
    );

    expect(result).toMatchObject({ skipped: "weekend", businessDate: "2026-07-18" });
    expect(mockDb.getScheduledNotificationRun).not.toHaveBeenCalled();
  });

  it("does not resend after a completed run", async () => {
    mockDb.getScheduledNotificationRun.mockResolvedValue({
      id: 1,
      jobKey: DAILY_INSIGHT_REMINDER_JOB_KEY,
      businessDate: "2026-07-16",
      status: "sent",
      recipientCount: 3,
      messageId: "om_message",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await runDailyInsightReminder(
      new Date("2026-07-16T08:30:00.000Z"),
    );

    expect(result).toMatchObject({ skipped: "already-completed", recipientCount: 3 });
    expect(mockDb.beginScheduledNotificationRun).not.toHaveBeenCalled();
    expect(mockSendLarkTextMessage).not.toHaveBeenCalled();
  });

  it("does not send twice while another run is in progress", async () => {
    mockDb.getScheduledNotificationRun.mockResolvedValue({
      id: 1,
      jobKey: DAILY_INSIGHT_REMINDER_JOB_KEY,
      businessDate: "2026-07-16",
      status: "pending",
      recipientCount: 0,
      messageId: null,
      errorMessage: null,
      createdAt: new Date("2026-07-16T08:29:00.000Z"),
      updatedAt: new Date("2026-07-16T08:29:00.000Z"),
    });

    const result = await runDailyInsightReminder(
      new Date("2026-07-16T08:30:00.000Z"),
    );

    expect(result).toMatchObject({ skipped: "in-progress" });
    expect(mockDb.beginScheduledNotificationRun).not.toHaveBeenCalled();
    expect(mockSendLarkTextMessage).not.toHaveBeenCalled();
  });

  it("records a skipped run when everyone submitted", async () => {
    mockDb.listUsersMissingInsightBetween.mockResolvedValue([]);

    const result = await runDailyInsightReminder(
      new Date("2026-07-16T08:30:00.000Z"),
    );

    expect(result).toMatchObject({ skipped: "no-missing-users", recipientCount: 0 });
    expect(mockSendLarkTextMessage).not.toHaveBeenCalled();
    expect(mockDb.finishScheduledNotificationRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped", recipientCount: 0 }),
    );
  });

  it("sends missing users and records the Lark message id", async () => {
    mockDb.listUsersMissingInsightBetween.mockResolvedValue([
      { id: 1, name: "田中 太郎", openId: "lark:ou_1" },
    ]);
    mockSendLarkTextMessage.mockResolvedValue({ messageId: "om_message" });

    const result = await runDailyInsightReminder(
      new Date("2026-07-16T08:30:00.000Z"),
    );

    expect(result).toMatchObject({ recipientCount: 1, messageId: "om_message" });
    expect(mockSendLarkTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("・田中 太郎") }),
    );
    expect(mockDb.finishScheduledNotificationRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent", messageId: "om_message" }),
    );
  });

  it("records a failed run and rethrows so Heartbeat can retry", async () => {
    mockDb.listUsersMissingInsightBetween.mockResolvedValue([
      { id: 1, name: "田中 太郎", openId: "lark:ou_1" },
    ]);
    mockSendLarkTextMessage.mockRejectedValue(new Error("Lark unavailable"));

    await expect(
      runDailyInsightReminder(new Date("2026-07-16T08:30:00.000Z")),
    ).rejects.toThrow("Lark unavailable");
    expect(mockDb.finishScheduledNotificationRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", errorMessage: "Lark unavailable" }),
    );
  });
});
