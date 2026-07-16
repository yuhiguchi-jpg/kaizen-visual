import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/components/ImprovementCaseCard.tsx", import.meta.url),
  "utf8",
);
const librarySource = readFileSync(
  new URL("../client/src/pages/ImprovementsLibrary.tsx", import.meta.url),
  "utf8",
);

describe("改善事例カードの高さと投稿者位置", () => {
  it("全カードを同じ最大高さで構成する", () => {
    expect(source).toContain("data-improvement-card");
    expect(source).toContain("flex h-[38rem] flex-col");
    expect(source).toContain("data-improvement-card-image");
    expect(source).toContain("h-[17rem] shrink-0");
    expect(source).toContain("data-improvement-card-body");
    expect(source).toContain("h-[21rem]");
  });

  it("制作物URLの有無にかかわらず操作枠を確保して投稿者を下端へ固定する", () => {
    expect(source).toContain("data-improvement-card-actions");
    expect(source).toContain("h-14 shrink-0 flex-nowrap");
    expect(source).not.toContain("{(item.workUrl || canDelete) &&");
    expect(source).toContain("data-improvement-card-author");
    expect(source).toContain("mt-auto flex shrink-0 items-center justify-between");
  });
});

describe("改善事例画像の印刷操作", () => {
  it("カードと全画面ビューアーの両方から同じ画像印刷処理を呼び出す", () => {
    expect(librarySource).toContain('import { printImprovementImage } from "@/lib/improvementImagePrint"');
    expect(librarySource).toContain("item.imageUrl && <Button");
    expect(librarySource).toContain("viewerImage && printImage(viewerImage)");
    expect(librarySource.match(/<Printer/g)).toHaveLength(2);
  });
});
