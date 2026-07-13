import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/pages/InsightsFeed.tsx", import.meta.url),
  "utf8",
);

describe("みんなの気づきのいいね・コメント接続", () => {
  it("新しいいいね・コメントAPIを利用する", () => {
    expect(source).toContain("trpc.insights.toggleLike.useMutation");
    expect(source).toContain("trpc.insights.comments.useQuery");
    expect(source).toContain("trpc.insights.addComment.useMutation");
    expect(source).toContain("trpc.insights.deleteComment.useMutation");
  });

  it("旧リアクションAPIと返却項目を参照しない", () => {
    expect(source).not.toContain("toggleReaction");
    expect(source).not.toContain("myReactions");
    expect(source).not.toContain("reactionCounts");
    expect(source).not.toContain('key: "spark"');
    expect(source).not.toContain('key: "agree"');
    expect(source).not.toContain('key: "thanks"');
    expect(source).not.toContain('key: "idea"');
    expect(source).not.toContain("いい気づき");
    expect(source).not.toContain("共感");
    expect(source).not.toContain("ありがとう");
    expect(source).not.toContain("発展しそう");
    expect(source).not.toContain("✨");
    expect(source).not.toContain("🙌");
    expect(source).not.toContain("👏");
    expect(source).not.toContain("💡");
  });

  it("いいねとコメントの操作表示を備える", () => {
    expect(source).toContain("<Heart");
    expect(source).toContain("<MessageCircle");
    expect(source).toContain("コメントを書く");
  });
});
