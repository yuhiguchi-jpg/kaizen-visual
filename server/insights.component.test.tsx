// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toggleLike: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  deleteInsight: vi.fn(),
}));

const insight = {
  id: 11,
  authorId: 7,
  authorName: "Yuma Matsushita",
  genre: "AI・生成AI活用",
  content: "日報の要約をAIで支援できそうです。",
  createdAt: new Date("2026-07-13T00:00:00.000Z"),
  likeCount: 3,
  likedByMe: false,
  commentCount: 1,
};

const comment = {
  id: 21,
  insightId: insight.id,
  authorId: insight.authorId,
  authorName: insight.authorName,
  content: "試行対象を決めて進めます。",
  createdAt: new Date("2026-07-13T01:00:00.000Z"),
};

const listCache = {
  cancel: vi.fn().mockResolvedValue(undefined),
  getData: vi.fn().mockReturnValue([insight]),
  setData: vi.fn(),
  invalidate: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: insight.authorId, name: insight.authorName } }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      insights: {
        list: listCache,
        comments: { invalidate: vi.fn().mockResolvedValue(undefined) },
      },
      dashboard: {
        stats: { invalidate: vi.fn().mockResolvedValue(undefined) },
      },
    }),
    insights: {
      list: {
        useQuery: () => ({ data: [insight], isLoading: false, error: null }),
      },
      toggleLike: {
        useMutation: () => ({ mutate: mocks.toggleLike, isPending: false }),
      },
      comments: {
        useQuery: () => ({ data: [comment], isLoading: false }),
      },
      addComment: {
        useMutation: () => ({ mutate: mocks.addComment, isPending: false }),
      },
      deleteComment: {
        useMutation: () => ({ mutate: mocks.deleteComment, isPending: false }),
      },
      delete: {
        useMutation: () => ({ mutate: mocks.deleteInsight, isPending: false }),
      },
    },
  },
}));

import InsightsFeed from "../client/src/pages/InsightsFeed";

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

describe("みんなの気づきのいいね・コメントUI", () => {
  it.each([
    ["PC", 1280],
    ["モバイル", 390],
  ])("%s幅でいいね・コメント操作を表示する", async (_label, width) => {
    setViewport(width);
    const user = userEvent.setup();
    const { container } = render(<InsightsFeed />);

    expect(screen.getByRole("heading", { name: "みんなの気づき" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "いいね 3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "コメント 1" })).toBeTruthy();
    const actionRow = container.querySelector("[data-insight-actions]");
    expect(actionRow).toBeTruthy();
    expect(actionRow?.contains(screen.getByRole("button", { name: "いいね 3" }))).toBe(true);
    expect(actionRow?.contains(screen.getByRole("button", { name: "コメント 1" }))).toBe(true);
    expect(screen.queryByRole("textbox", { name: "コメント本文" })).toBeNull();
    expect(screen.queryByText(comment.content)).toBeNull();
    expect(container.querySelector(".sm\\:px-8.lg\\:px-12")).toBeTruthy();
    expect(container.querySelector("article.sm\\:p-7")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "いいね 3" }));
    expect(mocks.toggleLike).toHaveBeenCalledWith({ insightId: insight.id });
  });

  it("コメントを展開し、投稿して、本人コメントを削除できる", async () => {
    setViewport(390);
    const user = userEvent.setup();
    const { container } = render(<InsightsFeed />);

    await user.click(screen.getByRole("button", { name: "コメント 1" }));

    expect(screen.getByRole("button", { name: "コメント 1" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(comment.content)).toBeTruthy();
    expect(screen.getByRole("button", { name: "コメントを削除" })).toBeTruthy();
    expect(container.querySelector(".sm\\:p-5")).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "コメント本文" }), "確認用コメント");
    await user.click(screen.getByRole("button", { name: "コメントを投稿" }));
    expect(mocks.addComment).toHaveBeenCalledWith({
      insightId: insight.id,
      content: "確認用コメント",
    });

    await user.click(screen.getByRole("button", { name: "コメントを削除" }));
    expect(mocks.deleteComment).toHaveBeenCalledWith({ id: comment.id });
  });

  it("旧4種リアクションの文言と絵文字を表示しない", () => {
    render(<InsightsFeed />);

    for (const oldReaction of [
      "いい気づき",
      "共感",
      "ありがとう",
      "発展しそう",
      "✨",
      "🙌",
      "👏",
      "💡",
    ]) {
      expect(screen.queryByText(oldReaction)).toBeNull();
    }
  });
});
