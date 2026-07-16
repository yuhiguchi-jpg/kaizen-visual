import {
  createImprovementPrintDocument,
  IMPROVEMENT_PRINT_PAGE_STYLE,
} from "../client/src/lib/improvementImagePrint";
import { describe, expect, it } from "vitest";

describe("改善事例画像の印刷", () => {
  it("A4横向きの用紙内へ画像だけを自動フィットする", () => {
    expect(IMPROVEMENT_PRINT_PAGE_STYLE).toContain("size: A4 landscape");
    expect(IMPROVEMENT_PRINT_PAGE_STYLE).toContain("max-width: 297mm");
    expect(IMPROVEMENT_PRINT_PAGE_STYLE).toContain("max-height: 210mm");
    expect(IMPROVEMENT_PRINT_PAGE_STYLE).toContain("object-fit: contain");

    const html = createImprovementPrintDocument({
      src: "/api/storage/improvement.png",
      title: "梱包作業の改善",
    });

    expect(html).toContain('id="improvement-print-image"');
    expect(html).toContain('src="/api/storage/improvement.png"');
    expect(html).not.toContain("nav");
    expect(html).not.toContain("button");
  });

  it("画像URLとタイトルをHTMLエスケープする", () => {
    const html = createImprovementPrintDocument({
      src: 'https://example.com/image.png?x=1&label="test"',
      title: "<改善 & 安全>",
    });

    expect(html).toContain("&lt;改善 &amp; 安全&gt;");
    expect(html).toContain("x=1&amp;label=&quot;test&quot;");
    expect(html).not.toContain("<改善 & 安全>");
  });
});
