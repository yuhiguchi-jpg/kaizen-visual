import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatDisplayName } from "../shared/displayName";

describe("formatDisplayName", () => {
  it("Larkから取得した姓名の順序を保って表示する", () => {
    expect(formatDisplayName("雄馬 樋口")).toBe("雄馬 樋口");
  });

  it("全角空白と連続空白を正規化する", () => {
    expect(formatDisplayName("雄馬　　樋口")).toBe("雄馬 樋口");
  });

  it("空白のない名前は変更しない", () => {
    expect(formatDisplayName("樋口雄馬")).toBe("樋口雄馬");
  });

  it("名前がない場合は指定された代替表示を返す", () => {
    expect(formatDisplayName(undefined, "メンバー")).toBe("メンバー");
  });
});

describe("氏名表示コンポーネントとの接続", () => {
  const displayFiles = [
    "../client/src/components/DashboardLayout.tsx",
    "../client/src/pages/InsightsFeed.tsx",
    "../client/src/pages/ImprovementsLibrary.tsx",
  ];

  it.each(displayFiles)("%s がLark由来の順序を保つ共通表示処理を利用する", relativePath => {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    const occurrences = source.match(/formatDisplayName/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });
});
