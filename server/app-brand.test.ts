import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const brandSource = readFileSync(
  new URL("../client/src/components/AppBrand.tsx", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../client/src/components/DashboardLayout.tsx", import.meta.url),
  "utf8",
);
const htmlSource = readFileSync(
  new URL("../client/index.html", import.meta.url),
  "utf8",
);

describe("アプリブランド表示", () => {
  it("アプリ名を2G版 KAIZEN Appへ統一し、2G版を強調する", () => {
    expect(brandSource).toContain('aria-label="2G版 KAIZEN App"');
    expect(brandSource).toContain("font-extrabold");
    expect(brandSource).toContain("bg-primary");
    expect(htmlSource).toContain("<title>2G版 KAIZEN App</title>");
  });

  it("ログイン画面とサイドバーで共通ブランドを使い、旧アイコンを表示しない", () => {
    expect(layoutSource).toContain("<AppBrand inverse");
    expect(layoutSource).toContain("<AppBrand compact");
    expect(layoutSource).not.toContain("knowledge-mark");
    expect(layoutSource).not.toContain("KAIZEN VISION");
  });
});
