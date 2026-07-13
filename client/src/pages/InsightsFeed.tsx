import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { INSIGHT_GENRES, type InsightGenre } from "@shared/insightGenres";
import { Lightbulb, PenLine, Search, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const reactions = [
  { key: "spark" as const, emoji: "✨", label: "いい気づき" },
  { key: "agree" as const, emoji: "🙌", label: "共感" },
  { key: "thanks" as const, emoji: "👏", label: "ありがとう" },
  { key: "idea" as const, emoji: "💡", label: "発展しそう" },
];

export default function InsightsFeed() {
  const [, navigate] = useLocation();
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
  const toggle = trpc.insights.toggleReaction.useMutation({
    onSuccess: () => utils.insights.list.invalidate(),
    onError: error => toast.error(error.message || "リアクションできませんでした"),
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
                <Avatar className="h-10 w-10 border border-white shadow-sm"><AvatarFallback className="bg-accent font-semibold text-primary">{item.authorName.charAt(0)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.authorName}</p><span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-primary">{item.genre}</span></div><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-foreground/90">{item.content}</p>
                  <div className="mt-5 flex flex-wrap gap-2">{reactions.map(reaction => { const active = item.myReactions.includes(reaction.key); const count = item.reactionCounts[reaction.key]; return <button key={reaction.key} title={reaction.label} aria-pressed={active} onClick={() => toggle.mutate({ insightId: item.id, reaction: reaction.key })} className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${active ? "border-primary/25 bg-accent text-primary shadow-sm" : "border-border/70 bg-white/50 text-muted-foreground hover:bg-white"}`}><span aria-hidden>{reaction.emoji}</span><span>{count}</span></button>; })}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
