import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { INSIGHT_GENRES } from "../../shared/insightGenres";
import {
  createInsight,
  createInsightComment,
  deleteInsight,
  deleteInsightComment,
  getInsight,
  getInsightComment,
  insightExists,
  listInsightComments,
  listInsights,
  toggleInsightLike,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const insightGenreSchema = z.enum(INSIGHT_GENRES);
export const insightCommentContentSchema = z.string().trim().min(1, "コメントを入力してください").max(500, "コメントは500文字以内で入力してください");
export const insightListInputSchema = z.object({
  genre: insightGenreSchema.optional(),
  keyword: z.string().trim().max(200).optional(),
  author: z.string().trim().max(100).optional(),
}).optional();

export function canDeleteInsight(item: { authorId: number } | null | undefined, userId: number) {
  return Boolean(item && item.authorId === userId);
}

export function canDeleteInsightComment(item: { authorId: number } | null | undefined, userId: number) {
  return Boolean(item && item.authorId === userId);
}

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
  toggleLike: protectedProcedure
    .input(z.object({ insightId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!(await insightExists(input.insightId))) throw new TRPCError({ code: "NOT_FOUND" });
      return toggleInsightLike(input.insightId, ctx.user.id);
    }),
  comments: protectedProcedure
    .input(z.object({ insightId: z.number().int().positive() }))
    .query(async ({ input }) => {
      if (!(await insightExists(input.insightId))) throw new TRPCError({ code: "NOT_FOUND" });
      const comments = await listInsightComments(input.insightId);
      return comments.map(comment => ({
        ...comment,
        authorName: comment.authorName || "メンバー",
      }));
    }),
  addComment: protectedProcedure
    .input(z.object({ insightId: z.number().int().positive(), content: insightCommentContentSchema }))
    .mutation(async ({ ctx, input }) => {
      if (!(await insightExists(input.insightId))) throw new TRPCError({ code: "NOT_FOUND" });
      const id = await createInsightComment(input.insightId, ctx.user.id, input.content);
      return { id };
    }),
  deleteComment: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await getInsightComment(input.id);
      if (!canDeleteInsightComment(comment, ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteInsightComment(comment.id, ctx.user.id);
      return { success: true as const };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getInsight(input.id);
      if (!canDeleteInsight(item, ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteInsight(item.id, ctx.user.id);
      return { success: true as const };
    }),
});
