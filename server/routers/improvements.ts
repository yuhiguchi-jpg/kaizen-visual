import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  calculateAnnualSavedSeconds,
  calculateReductionRate,
  formatDuration,
  formatFrequency,
  frequencyPeriods,
} from "@shared/improvementTime";
import {
  createImprovementCase,
  deleteImprovementCase,
  getImprovementCase,
  listPublishedImprovementCases,
  publishImprovementCase,
  saveGeneratedImprovementImage,
  updateImprovementDraft,
} from "../db";
import { generateImage } from "../_core/imageGeneration";
import { protectedProcedure, router } from "../_core/trpc";

export const improvementInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  workUrl: z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().url("http:// または https:// で始まるURLを入力してください").max(2048).refine(
      value => ["http:", "https:"].includes(new URL(value).protocol),
      "http:// または https:// で始まるURLを入力してください",
    ).optional(),
  ),
  originalMethod: z.string().trim().min(1).max(2000),
  problem: z.string().trim().min(1).max(2000),
  beforeSeconds: z.number().int().min(1).max(31536000),
  solution: z.string().trim().min(1).max(2000),
  afterSeconds: z.number().int().min(0).max(31536000),
  frequencyCount: z.number().int().min(1).max(100000),
  frequencyPeriod: z.enum(frequencyPeriods),
});

export const improvementSearchInputSchema = z.object({
  query: z.string().trim().max(200).optional(),
}).optional();

type ImprovementPromptInput = Pick<
  z.infer<typeof improvementInputSchema>,
  "title" | "originalMethod" | "problem" | "beforeSeconds" | "solution" | "afterSeconds" | "frequencyCount" | "frequencyPeriod"
>;

export function buildImprovementImagePrompt(input: ImprovementPromptInput) {
  const annualSavedSeconds = calculateAnnualSavedSeconds(input);
  const reductionRate = calculateReductionRate(input.beforeSeconds, input.afterSeconds);
  return `Create a refined Japanese editorial infographic card that summarizes one workplace improvement case for an internal knowledge-sharing application.

Exact Japanese content to render:
Main title: ${input.title}
BEFORE section label: BEFORE
元の方法: ${input.originalMethod}
課題: ${input.problem}
改善前: ${formatDuration(input.beforeSeconds)}
AFTER section label: AFTER
解決方法: ${input.solution}
改善後: ${formatDuration(input.afterSeconds)}
発生頻度: ${formatFrequency(input.frequencyCount, input.frequencyPeriod)}
成果 callout: 年間${formatDuration(annualSavedSeconds)}削減 / ${reductionRate}%短縮

Composition: landscape 4:3 single-page card, strong left-to-right BEFORE to AFTER flow, generous whitespace, clear information hierarchy, readable Japanese text, small abstract workflow icons, no people and no device mockup.
Style: premium Japanese business editorial design, near-white pale blue paper background, refined royal blue and navy geometric forms, restrained sky blue accents, charcoal typography, subtle paper grain, elegant and calm, consistent reusable brand system.
Title requirements: display the supplied main title prominently at the top as the only document title. Do not add a generic business-improvement heading, English document-category label, or any other fixed heading before or after it.
Constraints: render all supplied facts faithfully, do not invent statistics or claims, no logos, no watermark, no decorative text beyond the specified labels.`;
}

function toPersistenceValues(input: z.infer<typeof improvementInputSchema>) {
  return {
    ...input,
    beforeMinutes: Math.ceil(input.beforeSeconds / 60),
    afterMinutes: Math.ceil(input.afterSeconds / 60),
  };
}

export function canDeleteImprovementCase(item: { authorId: number } | null | undefined, userId: number) {
  return Boolean(item && item.authorId === userId);
}

export const improvementsRouter = router({
  listPublished: protectedProcedure
    .input(improvementSearchInputSchema)
    .query(({ input }) => listPublishedImprovementCases(input?.query)),
  saveDraft: protectedProcedure
    .input(improvementInputSchema.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const prompt = buildImprovementImagePrompt(values);
      const persistedValues = toPersistenceValues(values);
      if (id) {
        const item = await getImprovementCase(id);
        if (!item || item.authorId !== ctx.user.id || item.status !== "draft") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await updateImprovementDraft(id, ctx.user.id, { ...persistedValues, imagePrompt: prompt });
        return { id };
      }
      const newId = await createImprovementCase({ ...persistedValues, authorId: ctx.user.id, imagePrompt: prompt });
      return { id: newId };
    }),
  generate: protectedProcedure
    .input(improvementInputSchema.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id: draftId, ...values } = input;
      const prompt = buildImprovementImagePrompt(values);
      const persistedValues = toPersistenceValues(values);
      let id = draftId;
      if (id) {
        const item = await getImprovementCase(id);
        if (!item || item.authorId !== ctx.user.id || item.status !== "draft") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await updateImprovementDraft(id, ctx.user.id, { ...persistedValues, imagePrompt: prompt });
      } else {
        id = await createImprovementCase({ ...persistedValues, authorId: ctx.user.id, imagePrompt: prompt });
      }
      try {
        const image = await generateImage({ prompt, model: "MODEL_GPT_IMAGE_2", quality: "medium" });
        if (!image.url) throw new Error("Image URL was not returned");
        await saveGeneratedImprovementImage(id, image.url, prompt);
        return { id, imageUrl: image.url };
      } catch (error) {
        console.error("[Improvements] Image generation failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "画像の生成に失敗しました。時間をおいて再度お試しください。" });
      }
    }),
  regenerate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getImprovementCase(input.id);
      if (!item || item.authorId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const prompt = buildImprovementImagePrompt(item);
      try {
        const image = await generateImage({ prompt, model: "MODEL_GPT_IMAGE_2", quality: "medium" });
        if (!image.url) throw new Error("Image URL was not returned");
        await saveGeneratedImprovementImage(item.id, image.url, prompt);
        return { imageUrl: image.url };
      } catch (error) {
        console.error("[Improvements] Image regeneration failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "画像の再生成に失敗しました。時間をおいて再度お試しください。" });
      }
    }),
  publish: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getImprovementCase(input.id);
      if (!item || item.authorId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      if (!item.imageUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "先に画像を生成してください。" });
      await publishImprovementCase(item.id, ctx.user.id);
      return { success: true as const };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getImprovementCase(input.id);
      if (!canDeleteImprovementCase(item, ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteImprovementCase(item.id, ctx.user.id);
      return { success: true as const };
    }),
});
