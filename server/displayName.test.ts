import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatReversedDisplayName } from "../shared/displayName";

describe("formatReversedDisplayName", () => {
  it("姓名を逆順にして表示する", () => {
    expect(formatReversedDisplayName("雄馬 樋口")).toBe("樋口 雄馬");
  });

  it("全角空白と連続空白を正規化する", () => {
    expect(formatReversedDisplayName("雄馬　　樋口")).toBe("樋口 雄馬");
  });

  it("空白のない名前は変更しない", () => {
    expect(formatReversedDisplayName("樋口雄馬")).toBe("樋口雄馬");
  });

  it("名前がない場合は指定された代替表示を返す", () => {
    expect(formatReversedDisplayName(undefined, "メンバー")).toBe("メンバー");
  });
});

describe("氏名表示コンポーネントとの接続", () => {
  const displayFiles = [
    "../client/src/components/DashboardLayout.tsx",
    "../client/src/pages/InsightsFeed.tsx",
    "../client/src/pages/ImprovementsLibrary.tsx",
  ];

  it.each(displayFiles)("%s が共通の逆順変換を利用する", relativePath => {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    const occurrences = source.match(/formatReversedDisplayName/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });
});
