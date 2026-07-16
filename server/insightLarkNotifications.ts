import { ENV } from "./_core/env";
import { sendLarkTextMessage } from "./larkMessaging";

type NotificationResult =
  | { sent: true; messageId: string | null }
  | { sent: false; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function formatNewInsightMessage(input: {
  authorName: string;
  genre: string;
  content: string;
}): string {
  return [
    "【新しい気づきが投稿されました】",
    `投稿者：${input.authorName}`,
    `ジャンル：${input.genre}`,
    "",
    input.content,
  ].join("\n");
}

export function formatNewInsightCommentMessage(input: {
  commenterName: string;
  insightAuthorName: string;
  insightGenre: string;
  insightContent: string;
  commentContent: string;
}): string {
  return [
    "【気づきに新しいコメントが投稿されました】",
    `コメント投稿者：${input.commenterName}`,
    `気づきの投稿者：${input.insightAuthorName}`,
    `ジャンル：${input.insightGenre}`,
    `元の気づき：${input.insightContent}`,
    "",
    `コメント：${input.commentContent}`,
  ].join("\n");
}

async function sendSafely(text: string, eventName: string): Promise<NotificationResult> {
  try {
    const result = await sendLarkTextMessage({
      chatId: ENV.larkDailyInsightChatId,
      text,
    });
    return { sent: true, messageId: result.messageId };
  } catch (error) {
    const message = errorMessage(error);
    console.error(`[Lark] ${eventName} notification failed:`, message);
    return { sent: false, error: message };
  }
}

export function notifyNewInsight(input: {
  authorName: string;
  genre: string;
  content: string;
}): Promise<NotificationResult> {
  return sendSafely(formatNewInsightMessage(input), "new insight");
}

export function notifyNewInsightComment(input: {
  commenterName: string;
  insightAuthorName: string;
  insightGenre: string;
  insightContent: string;
  commentContent: string;
}): Promise<NotificationResult> {
  return sendSafely(formatNewInsightCommentMessage(input), "new insight comment");
}
