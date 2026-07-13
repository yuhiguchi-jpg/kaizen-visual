import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { INSIGHT_GENRES } from "../../shared/insightGenres";
import { createInsight, insightExists, listInsights, toggleInsightReaction } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const reactionSchema = z.enum(["spark", "agree", "thanks", "idea"]);
export const insightGenreSchema = z.enum(INSIGHT_GENRES);
export const insightListInputSchema = z.object({
  genre: insightGenreSchema.optional(),
  keyword: z.string().trim().max(200).optional(),
  author: z.string().trim().max(100).optional(),
}).optional();

export const insightsRouter = router({
  list: protectedProcedure
    .input(insightListInputSchema)
    .query(({ ctx, input }) => listInsights(ctx.user.id, input)),
  create: protectedProcedure
    .input(z.object({ genre: insightGenreSchema, content: z.string().trim().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const id = await createInsight({ authorId: ctx.user.id, genre: input.genre, content: input.content });
      return { id };
    }),
  toggleReaction: protectedProcedure
    .input(z.object({ insightId: z.number().int().positive(), reaction: reactionSchema }))
    .mutation(async ({ ctx, input }) => {
      if (!(await insightExists(input.insightId))) throw new TRPCError({ code: "NOT_FOUND" });
      return toggleInsightReaction(input.insightId, ctx.user.id, input.reaction);
    }),
});
