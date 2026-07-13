import { describe, expect, it } from "vitest";
import { INSIGHT_GENRES } from "../shared/insightGenres";
import {
  canDeleteInsight,
  canDeleteInsightComment,
  insightCommentContentSchema,
  insightGenreSchema,
  insightListInputSchema,
} from "./routers/insights";

describe("insight genres", () => {
  it("supports the DX implementation and adoption support taxonomy", () => {
    expect(INSIGHT_GENRES).toContain("導入設計・ロードマップ");
    expect(INSIGHT_GENRES).toContain("定着支援・伴走");
    expect(insightGenreSchema.safeParse("定着支援・伴走").success).toBe(true);
  });

  it("rejects unknown genres", () => {
    expect(insightGenreSchema.safeParse("未定義ジャンル").success).toBe(false);
  });
});

describe("insight list filters", () => {
  it("accepts genre, keyword, and author filters together", () => {
    expect(insightListInputSchema.parse({
      genre: "AI・ツール活用",
      keyword: "研修",
      author: "山田",
    })).toEqual({ genre: "AI・ツール活用", keyword: "研修", author: "山田" });
  });

  it("rejects excessively long search text", () => {
    expect(insightListInputSchema.safeParse({ keyword: "あ".repeat(201) }).success).toBe(false);
    expect(insightListInputSchema.safeParse({ author: "あ".repeat(101) }).success).toBe(false);
  });
});

describe("insight deletion authorization", () => {
  it("allows only the author to delete an insight", () => {
    expect(canDeleteInsight({ authorId: 12 }, 12)).toBe(true);
    expect(canDeleteInsight({ authorId: 12 }, 99)).toBe(false);
    expect(canDeleteInsight(null, 12)).toBe(false);
  });
});

describe("insight comments", () => {
  it("trims valid comment content", () => {
    expect(insightCommentContentSchema.parse(" 参考になりました ")).toBe("参考になりました");
  });

  it("rejects empty or excessively long comments", () => {
    expect(insightCommentContentSchema.safeParse("   ").success).toBe(false);
    expect(insightCommentContentSchema.safeParse("あ".repeat(501)).success).toBe(false);
  });

  it("allows only the author to delete a comment", () => {
    expect(canDeleteInsightComment({ authorId: 12 }, 12)).toBe(true);
    expect(canDeleteInsightComment({ authorId: 12 }, 99)).toBe(false);
    expect(canDeleteInsightComment(undefined, 12)).toBe(false);
  });
});
