// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const items = [
  {
    id: 1,
    authorId: 7,
    authorName: "Yuma Matsushita",
    title: "制作物URLがある改善",
    problem: "定型作業に時間がかかっていました。",
    beforeSeconds: 3600,
    afterSeconds: 1200,
    frequencyCount: 5,
    frequencyPeriod: "week" as const,
    annualSavedSeconds: 624000,
    imageUrl: "https://example.com/with-url.png",
    workUrl: "https://example.com/work",
    publishedAt: new Date("2026-07-13T00:00:00.000Z"),
  },
  {
    id: 2,
    authorId: 8,
    authorName: "Hanako Tanaka",
    title: "制作物URLがない改善",
    problem: "確認工程が属人化していました。",
    beforeSeconds: 2700,
    afterSeconds: 900,
    frequencyCount: 2,
    frequencyPeriod: "week" as const,
    annualSavedSeconds: 187200,
    imageUrl: "https://example.com/without-url.png",
    workUrl: null,
    publishedAt: new Date("2026-07-12T00:00:00.000Z"),
  },
];

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 99, name: "Viewer" } }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/improvements", vi.fn()],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      improvements: { listPublished: { invalidate: vi.fn().mockResolvedValue(undefined) } },
      dashboard: { stats: { invalidate: vi.fn().mockResolvedValue(undefined) } },
    }),
    improvements: {
      listPublished: {
        useQuery: () => ({ data: items, isLoading: false, isFetching: false, error: null }),
      },
      delete: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

import ImprovementsLibrary from "../client/src/pages/ImprovementsLibrary";

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
});

describe("改善事例カードの統一レイアウト", () => {
  it.each([
    ["PC", 1280],
    ["モバイル", 390],
  ])("%s幅でURL有無にかかわらず同じカード骨格を使う", (_label, width) => {
    setViewport(width);
    const { container } = render(<ImprovementsLibrary />);

    expect(screen.getByRole("heading", { name: "改善ライブラリ" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "制作物を開く" })).toBeTruthy();

    const cards = Array.from(container.querySelectorAll("[data-improvement-card]"));
    const images = Array.from(container.querySelectorAll("[data-improvement-card-image]"));
    const bodies = Array.from(container.querySelectorAll("[data-improvement-card-body]"));
    const actionAreas = Array.from(container.querySelectorAll("[data-improvement-card-actions]"));
    const authorAreas = Array.from(container.querySelectorAll("[data-improvement-card-author]"));

    expect(cards).toHaveLength(2);
    expect(images).toHaveLength(2);
    expect(bodies).toHaveLength(2);
    expect(actionAreas).toHaveLength(2);
    expect(authorAreas).toHaveLength(2);
    expect(cards.every(card => card.classList.contains("h-[38rem]"))).toBe(true);
    expect(images.every(image => image.classList.contains("h-[17rem]"))).toBe(true);
    expect(bodies.every(body => body.classList.contains("h-[21rem]"))).toBe(true);
    expect(actionAreas.every(area => area.classList.contains("h-14"))).toBe(true);
    expect(actionAreas.every(area => area.classList.contains("shrink-0"))).toBe(true);
    expect(authorAreas.every(area => area.classList.contains("mt-auto"))).toBe(true);
    expect(authorAreas.every(area => area.classList.contains("shrink-0"))).toBe(true);
  });
});
