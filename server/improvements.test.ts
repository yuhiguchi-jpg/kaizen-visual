import { describe, expect, it } from "vitest";
import { buildImprovementImagePrompt, improvementInputSchema } from "./routers/improvements";

const caseInput = {
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
});

describe("buildImprovementImagePrompt", () => {
  it("keeps the fixed editorial art direction and exact case facts", () => {
    const prompt = buildImprovementImagePrompt(caseInput);
    expect(prompt).toContain("warm ivory paper background");
    expect(prompt).toContain("deep teal geometric forms");
    expect(prompt).toContain("紙の申請書を各部署へ手渡ししていた");
    expect(prompt).toContain("改善前: 60分");
    expect(prompt).toContain("改善後: 15分");
    expect(prompt).toContain("45分削減 / 75%短縮");
    expect(prompt).toContain("do not invent statistics or claims");
  });
});
