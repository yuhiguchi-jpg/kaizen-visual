import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createImprovementCase: vi.fn(),
  deleteImprovementCase: vi.fn(),
  getImprovementCase: vi.fn(),
  listPublishedImprovementCases: vi.fn(),
  publishImprovementCase: vi.fn(),
  saveGeneratedImprovementImage: vi.fn(),
  updateImprovementDraft: vi.fn(),
}));

const imageMocks = vi.hoisted(() => ({
  generateImage: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/imageGeneration", () => imageMocks);

import { improvementsRouter } from "./routers/improvements";

const caseInput = {
  title: "申請承認時間を75％短縮",
  originalMethod: "紙の申請書を各部署へ手渡ししていた",
  problem: "承認状況が分からず、確認に時間がかかっていた",
  beforeMinutes: 60,
  solution: "共有フォームと自動通知に置き換えた",
  afterMinutes: 15,
};

function createContext(userId = 12): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user-${userId}@example.com`,
      name: "テスト 利用者",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("improvement image generation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates an image for a new draft, saves it, and returns its URL", async () => {
    dbMocks.createImprovementCase.mockResolvedValue(42);
    imageMocks.generateImage.mockResolvedValue({ url: "/api/storage/generated-case.png" });

    const result = await improvementsRouter.createCaller(createContext()).generate(caseInput);

    const prompt = expect.stringContaining("Main title: 申請承認時間を75％短縮");
    expect(imageMocks.generateImage).toHaveBeenCalledWith({
      prompt,
      model: "MODEL_GPT_IMAGE_2",
      quality: "medium",
    });
    expect(dbMocks.saveGeneratedImprovementImage).toHaveBeenCalledWith(
      42,
      "/api/storage/generated-case.png",
      expect.stringContaining("45分削減 / 75%短縮"),
    );
    expect(result).toEqual({ id: 42, imageUrl: "/api/storage/generated-case.png" });
  });

  it("regenerates and saves an image only for the signed-in author", async () => {
    dbMocks.getImprovementCase.mockResolvedValue({
      id: 42,
      authorId: 12,
      ...caseInput,
    });
    imageMocks.generateImage.mockResolvedValue({ url: "/api/storage/regenerated-case.png" });

    const result = await improvementsRouter.createCaller(createContext()).regenerate({ id: 42 });

    expect(imageMocks.generateImage).toHaveBeenCalledWith({
      prompt: expect.stringContaining("Main title: 申請承認時間を75％短縮"),
      model: "MODEL_GPT_IMAGE_2",
      quality: "medium",
    });
    expect(dbMocks.saveGeneratedImprovementImage).toHaveBeenCalledWith(
      42,
      "/api/storage/regenerated-case.png",
      expect.stringContaining("45分削減 / 75%短縮"),
    );
    expect(result).toEqual({ imageUrl: "/api/storage/regenerated-case.png" });
  });

  it("maps an upstream generation failure to a user-facing tRPC error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    dbMocks.createImprovementCase.mockResolvedValue(42);
    imageMocks.generateImage.mockRejectedValue(new Error("Forge unavailable"));

    await expect(improvementsRouter.createCaller(createContext()).generate(caseInput))
      .rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "画像の生成に失敗しました。時間をおいて再度お試しください。",
      });
    expect(dbMocks.saveGeneratedImprovementImage).not.toHaveBeenCalled();
  });
});
