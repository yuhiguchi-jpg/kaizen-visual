import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/pages/ImprovementsLibrary.tsx", import.meta.url),
  "utf8",
);

describe("改善事例カードの高さと投稿者位置", () => {
  it("全カードを同じ最大高さで構成する", () => {
    expect(source).toContain("data-improvement-card");
    expect(source).toContain("flex h-full flex-col");
    expect(source).toContain("data-improvement-card-body");
    expect(source).toContain("h-[21rem]");
  });

  it("制作物URLの有無にかかわらず操作枠を確保して投稿者を下端へ固定する", () => {
    expect(source).toContain("data-improvement-card-actions");
    expect(source).toContain("min-h-14");
    expect(source).not.toContain("{(item.workUrl || canDelete) &&");
    expect(source).toContain("data-improvement-card-author");
    expect(source).toContain("mt-auto flex items-center justify-between");
  });
});
