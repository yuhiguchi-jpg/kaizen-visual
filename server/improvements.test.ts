import { describe, expect, it } from "vitest";
import { clampImprovementImageZoom } from "../shared/improvementLibrary";
import {
  buildImprovementImagePrompt,
  canDeleteImprovementCase,
  improvementInputSchema,
  improvementSearchInputSchema,
} from "./routers/improvements";

const caseInput = {
  title: "申請承認時間を75％短縮",
  originalMethod: "紙の申請書を各部署へ手渡ししていた",
  problem: "承認状況が分からず、確認に時間がかかっていた",
  beforeMinutes: 60,
  solution: "共有フォームと自動通知に置き換えた",
  afterMinutes: 15,
};

describe("improvement case input", () => {
  it("accepts a complete structured improvement case", () => {
    expect(improvementInputSchema.parse(caseInput)).toEqual(caseInput);
  });

  it("rejects zero-minute before time and empty descriptions", () => {
    const result = improvementInputSchema.safeParse({
      ...caseInput,
      originalMethod: "",
      beforeMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = improvementInputSchema.safeParse({ ...caseInput, title: "  " });
    expect(result.success).toBe(false);
  });

  it("accepts an optional http or https work URL", () => {
    expect(improvementInputSchema.parse({ ...caseInput, workUrl: "https://example.com/demo" }).workUrl).toBe("https://example.com/demo");
    expect(improvementInputSchema.parse({ ...caseInput, workUrl: "" }).workUrl).toBeUndefined();
  });

  it("rejects unsafe work URL protocols", () => {
    expect(improvementInputSchema.safeParse({ ...caseInput, workUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("buildImprovementImagePrompt", () => {
  it("keeps the fixed editorial art direction and exact case facts", () => {
    const prompt = buildImprovementImagePrompt(caseInput);
    expect(prompt).toContain("Main title: 申請承認時間を75％短縮");
    expect(prompt).not.toContain("業務改善 CASE STUDY");
    expect(prompt).toContain("near-white pale blue paper background");
    expect(prompt).toContain("royal blue and navy geometric forms");
    expect(prompt).toContain("紙の申請書を各部署へ手渡ししていた");
    expect(prompt).toContain("改善前: 60分");
    expect(prompt).toContain("改善後: 15分");
    expect(prompt).toContain("45分削減 / 75%短縮");
    expect(prompt).toContain("do not invent statistics or claims");
  });

  it("does not include the optional work URL in the generated material", () => {
    const prompt = buildImprovementImagePrompt({ ...caseInput, workUrl: "https://example.com/demo" });
    expect(prompt).not.toContain("example.com");
  });
});

describe("improvement case deletion authorization", () => {
  it("allows only the author to delete a case", () => {
    expect(canDeleteImprovementCase({ authorId: 12 }, 12)).toBe(true);
    expect(canDeleteImprovementCase({ authorId: 12 }, 99)).toBe(false);
    expect(canDeleteImprovementCase(null, 12)).toBe(false);
  });
});

describe("improvement library search and image zoom", () => {
  it("trims a library search query and rejects an oversized query", () => {
    expect(improvementSearchInputSchema.parse({ query: "  申請業務  " })).toEqual({ query: "申請業務" });
    expect(improvementSearchInputSchema.safeParse({ query: "あ".repeat(201) }).success).toBe(false);
  });

  it("keeps image zoom within the supported range", () => {
    expect(clampImprovementImageZoom(0.25)).toBe(0.5);
    expect(clampImprovementImageZoom(1.75)).toBe(1.75);
    expect(clampImprovementImageZoom(4)).toBe(3);
  });
});
