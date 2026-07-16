import { beforeEach, describe, expect, it, vi } from "vitest";

const messagingMocks = vi.hoisted(() => ({
  sendLarkTextMessage: vi.fn(),
}));

vi.mock("./larkMessaging", () => messagingMocks);

import {
  formatNewInsightCommentMessage,
  formatNewInsightMessage,
  notifyNewInsight,
  notifyNewInsightComment,
} from "./insightLarkNotifications";

describe("insight Lark notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messagingMocks.sendLarkTextMessage.mockResolvedValue({ messageId: "om_test" });
  });

  it("formats a new insight with its author, genre, and content", () => {
    const text = formatNewInsightMessage({
      authorName: "山田 太郎",
      genre: "改善",
      content: "書類の置き場所を統一したい",
    });

    expect(text).toContain("【新しい気づきが投稿されました】");
    expect(text).toContain("投稿者：山田 太郎");
    expect(text).toContain("ジャンル：改善");
    expect(text).toContain("書類の置き場所を統一したい");
  });

  it("formats a new comment with the commenter and original insight", () => {
    const text = formatNewInsightCommentMessage({
      commenterName: "佐藤 花子",
      insightAuthorName: "山田 太郎",
      insightGenre: "安全",
      insightContent: "通路に荷物が置かれている",
      commentContent: "保管場所を決めましょう",
    });

    expect(text).toContain("【気づきに新しいコメントが投稿されました】");
    expect(text).toContain("コメント投稿者：佐藤 花子");
    expect(text).toContain("気づきの投稿者：山田 太郎");
    expect(text).toContain("元の気づき：通路に荷物が置かれている");
    expect(text).toContain("コメント：保管場所を決めましょう");
  });

  it("sends a new insight to the configured Lark chat", async () => {
    const result = await notifyNewInsight({
      authorName: "山田 太郎",
      genre: "改善",
      content: "入力手順を短くしたい",
    });

    expect(result).toEqual({ sent: true, messageId: "om_test" });
    expect(messagingMocks.sendLarkTextMessage).toHaveBeenCalledWith(expect.objectContaining({
      chatId: expect.any(String),
      text: expect.stringContaining("入力手順を短くしたい"),
    }));
  });

  it("returns a failure result instead of rejecting when Lark is unavailable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    messagingMocks.sendLarkTextMessage.mockRejectedValue(new Error("Lark unavailable"));

    const result = await notifyNewInsightComment({
      commenterName: "佐藤 花子",
      insightAuthorName: "山田 太郎",
      insightGenre: "改善",
      insightContent: "入力手順を短くしたい",
      commentContent: "賛成です",
    });

    expect(result).toEqual({ sent: false, error: "Lark unavailable" });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
