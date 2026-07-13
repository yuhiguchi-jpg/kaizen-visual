import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createImprovementCase,
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
  originalMethod: z.string().trim().min(1).max(2000),
  problem: z.string().trim().min(1).max(2000),
  beforeMinutes: z.number().int().min(1).max(100000),
  solution: z.string().trim().min(1).max(2000),
  afterMinutes: z.number().int().min(0).max(100000),
});

export function buildImprovementImagePrompt(input: z.infer<typeof improvementInputSchema>) {
  const savedMinutes = Math.max(0, input.beforeMinutes - input.afterMinutes);
  const reductionRate = Math.max(0, Math.round((savedMinutes / input.beforeMinutes) * 100));
  return `Create a refined Japanese editorial infographic card that summarizes one workplace improvement case for an internal knowledge-sharing application.

Exact Japanese content to render:
Main title: ${input.title}
BEFORE section label: BEFORE
元の方法: ${input.originalMethod}
課題: ${input.problem}
改善前: ${input.beforeMinutes}分
AFTER section label: AFTER
解決方法: ${input.solution}
改善後: ${input.afterMinutes}分
成果 callout: ${savedMinutes}分削減 / ${reductionRate}%短縮

Composition: landscape 4:3 single-page card, strong left-to-right BEFORE to AFTER flow, generous whitespace, clear information hierarchy, readable Japanese text, small abstract workflow icons, no people and no device mockup.
Style: premium Japanese business editorial design, near-white pale blue paper background, refined royal blue and navy geometric forms, restrained sky blue accents, charcoal typography, subtle paper grain, elegant and calm, consistent reusable brand system.
Title requirements: display the supplied main title prominently at the top as the only document title. Do not add a generic business-improvement heading, English document-category label, or any other fixed heading before or after it.
Constraints: render all supplied facts faithfully, do not invent statistics or claims, no logos, no watermark, no decorative text beyond the specified labels.`;
}

export const improvementsRouter = router({
  listPublished: protectedProcedure.query(() => listPublishedImprovementCases()),
  saveDraft: protectedProcedure
    .input(improvementInputSchema.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const prompt = buildImprovementImagePrompt(values);
      if (id) {
        const item = await getImprovementCase(id);
        if (!item || item.authorId !== ctx.user.id || item.status !== "draft") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await updateImprovementDraft(id, ctx.user.id, { ...values, imagePrompt: prompt });
        return { id };
      }
      const newId = await createImprovementCase({ ...values, authorId: ctx.user.id, imagePrompt: prompt });
      return { id: newId };
    }),
  generate: protectedProcedure
    .input(improvementInputSchema.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id: draftId, ...values } = input;
      const prompt = buildImprovementImagePrompt(values);
      let id = draftId;
      if (id) {
        const item = await getImprovementCase(id);
        if (!item || item.authorId !== ctx.user.id || item.status !== "draft") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await updateImprovementDraft(id, ctx.user.id, { ...values, imagePrompt: prompt });
      } else {
        id = await createImprovementCase({ ...values, authorId: ctx.user.id, imagePrompt: prompt });
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
});
