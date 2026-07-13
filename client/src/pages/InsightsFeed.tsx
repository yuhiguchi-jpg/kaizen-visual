import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatReversedDisplayName } from "@shared/displayName";
import { INSIGHT_GENRES, type InsightGenre } from "@shared/insightGenres";
import { Heart, Lightbulb, Loader2, MessageCircle, PenLine, Search, Send, Trash2, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type InsightCommentsProps = {
  insightId: number;
  commentCount: number;
  currentUserId?: number;
};

function InsightComments({ insightId, commentCount, currentUserId }: InsightCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const utils = trpc.useUtils();
  const commentsInput = useMemo(() => ({ insightId }), [insightId]);
  const { data: comments, isLoading } = trpc.insights.comments.useQuery(commentsInput, { enabled: isOpen });
  const addComment = trpc.insights.addComment.useMutation({
    onSuccess: async () => {
      setDraft("");
      await Promise.all([
        utils.insights.comments.invalidate(commentsInput),
        utils.insights.list.invalidate(),
      ]);
      toast.success("コメントを投稿しました");
    },
    onError: error => toast.error(error.message || "コメントを投稿できませんでした"),
  });
  const deleteComment = trpc.insights.deleteComment.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.insights.comments.invalidate(commentsInput),
        utils.insights.list.invalidate(),
      ]);
      toast.success("コメントを削除しました");
    },
    onError: error => toast.error(error.message || "コメントを削除できませんでした"),
  });
  const trimmedDraft = draft.trim();

  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(current => !current)}
        aria-expanded={isOpen}
        className="h-9 rounded-full px-3 text-muted-foreground hover:bg-accent hover:text-primary"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        コメント {commentCount}
      </Button>

      {isOpen && (
        <div className="mt-4 rounded-2xl bg-muted/45 p-4 sm:p-5">
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-4/5 rounded-xl" /></div>
          ) : comments?.length ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 border border-white"><AvatarFallback className="bg-white text-xs font-semibold text-primary">{formatReversedDisplayName(comment.authorName, "メ").charAt(0)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white/80 px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs font-semibold">{formatReversedDisplayName(comment.authorName, "メンバー")}</p><time className="mt-0.5 block text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>
                      {currentUserId === comment.authorId && <Button type="button" variant="ghost" size="icon-sm" aria-label="コメントを削除" onClick={() => deleteComment.mutate({ id: comment.id })} disabled={deleteComment.isPending} className="shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">最初のコメントを投稿しましょう。</p>
          )}

          <form
            className="mt-4 flex items-end gap-2"
            onSubmit={event => {
              event.preventDefault();
              if (trimmedDraft) addComment.mutate({ insightId, content: trimmedDraft });
            }}
          >
            <Textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="コメントを書く" maxLength={500} rows={2} className="min-h-16 resize-none rounded-xl bg-white/80" aria-label="コメント本文" />
            <Button type="submit" size="icon" aria-label="コメントを投稿" disabled={!trimmedDraft || addComment.isPending} className="h-10 w-10 shrink-0 rounded-xl">{addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </form>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{draft.length}/500</p>
        </div>
      )}
    </div>
  );
}

export default function InsightsFeed() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [genre, setGenre] = useState<InsightGenre | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [author, setAuthor] = useState("");
  const filters = useMemo(() => ({
    genre: genre === "all" ? undefined : genre,
    keyword: keyword.trim() || undefined,
    author: author.trim() || undefined,
  }), [genre, keyword, author]);
  const hasFilters = genre !== "all" || Boolean(keyword.trim()) || Boolean(author.trim());
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.insights.list.useQuery(filters);
  const toggleLike = trpc.insights.toggleLike.useMutation({
    onMutate: async ({ insightId }) => {
      await utils.insights.list.cancel(filters);
      const previous = utils.insights.list.getData(filters);
      utils.insights.list.setData(filters, current => current?.map(item => item.id === insightId ? {
        ...item,
        likedByMe: !item.likedByMe,
        likeCount: Math.max(0, item.likeCount + (item.likedByMe ? -1 : 1)),
      } : item));
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) utils.insights.list.setData(filters, context.previous);
      toast.error(error.message || "いいねできませんでした");
    },
    onSettled: () => utils.insights.list.invalidate(filters),
  });
  const removeInsight = trpc.insights.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.insights.list.cancel(filters);
      const previous = utils.insights.list.getData(filters);
      utils.insights.list.setData(filters, current => current?.filter(item => item.id !== id));
      return { previous };
    },
    onSuccess: async () => {
      await utils.dashboard.stats.invalidate();
      toast.success("気づきを削除しました");
    },
    onError: (error, _input, context) => {
      if (context?.previous) utils.insights.list.setData(filters, context.previous);
      toast.error(error.message || "気づきを削除できませんでした");
    },
    onSettled: () => utils.insights.list.invalidate(filters),
  });
  const clearFilters = () => { setGenre("all"); setKeyword(""); setAuthor(""); };

  return (
    <div className="knowledge-canvas min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Shared observations</p><h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">みんなの気づき</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">DXの導入・定着支援で蓄積された視点を探し、チームの知見として活用できます。</p></div>
          <Button onClick={() => navigate("/insights/new")} className="h-11 rounded-xl"><PenLine className="mr-2 h-4 w-4" />気づきを書く</Button>
        </div>

        <section aria-label="気づきの検索" className="editorial-card mt-8 rounded-[1.5rem] border border-white/80 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Select value={genre} onValueChange={value => setGenre(value as InsightGenre | "all")}>
              <SelectTrigger className="h-11 rounded-xl bg-white/60"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">すべてのジャンル</SelectItem>{INSIGHT_GENRES.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="キーワードで検索" maxLength={200} className="h-11 rounded-xl bg-white/60 pl-9" aria-label="本文キーワード" /></div>
            <div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={author} onChange={event => setAuthor(event.target.value)} placeholder="投稿者名で検索" maxLength={100} className="h-11 rounded-xl bg-white/60 pl-9" aria-label="投稿者名" /></div>
            <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters} className="h-11 rounded-xl px-3"><X className="mr-2 h-4 w-4" />クリア</Button>
          </div>
        </section>

        <div className="mt-5 space-y-4">
          {isLoading ? [1, 2, 3].map(item => <div key={item} className="editorial-card rounded-2xl border border-white/80 p-6"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-20 w-full" /></div></div></div>) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">気づきを読み込めませんでした。ページを再読み込みしてください。</div>
          ) : !data?.length ? (
            <div className="editorial-card flex flex-col items-center rounded-[2rem] border border-white/80 px-6 py-16 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><Lightbulb className="h-6 w-6" /></div><h2 className="page-title mt-6 text-xl font-semibold">{hasFilters ? "条件に合う気づきがありません" : "最初の気づきを共有しましょう"}</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{hasFilters ? "検索条件を変えるか、フィルターをクリアしてお試しください。" : "気づきが蓄積されるほど、チームの仕事を見直すきっかけが増えていきます。"}</p><Button onClick={hasFilters ? clearFilters : () => navigate("/insights/new")} className="mt-6 rounded-xl">{hasFilters ? "検索条件をクリア" : "気づきを書く"}</Button></div>
          ) : data.map(item => (
            <article key={item.id} className="editorial-card rounded-[1.5rem] border border-white/80 p-5 sm:p-7">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 border border-white shadow-sm"><AvatarFallback className="bg-accent font-semibold text-primary">{formatReversedDisplayName(item.authorName, "メ").charAt(0)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{formatReversedDisplayName(item.authorName, "メンバー")}</p><span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-primary">{item.genre}</span></div><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-foreground/90">{item.content}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <Button type="button" variant="outline" size="sm" aria-pressed={item.likedByMe} onClick={() => toggleLike.mutate({ insightId: item.id })} disabled={toggleLike.isPending} className={`h-9 rounded-full px-3 ${item.likedByMe ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700" : "border-border/70 bg-white/50 text-muted-foreground hover:bg-white"}`}><Heart className={`mr-2 h-4 w-4 ${item.likedByMe ? "fill-current" : ""}`} />いいね {item.likeCount}</Button>
                    {user?.id === item.authorId && <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />削除</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>この気づきを削除しますか？</AlertDialogTitle><AlertDialogDescription>投稿した気づきと、その気づきに付いたいいね・コメントを削除します。この操作は取り消せません。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => removeInsight.mutate({ id: item.id })} disabled={removeInsight.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">削除する</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
                  </div>
                  <InsightComments insightId={item.id} commentCount={item.commentCount} currentUserId={user?.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
