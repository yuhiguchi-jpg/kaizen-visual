import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Lightbulb, PenLine } from "lucide-react";
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
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.insights.list.useQuery();
  const toggle = trpc.insights.toggleReaction.useMutation({
    onSuccess: () => utils.insights.list.invalidate(),
    onError: error => toast.error(error.message || "リアクションできませんでした"),
  });

  return (
    <div className="knowledge-canvas min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Shared observations</p><h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">みんなの気づき</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">チームの視点に触れ、共感や感謝をリアクションで伝えましょう。</p></div>
          <Button onClick={() => navigate("/insights/new")} className="h-11 rounded-xl"><PenLine className="mr-2 h-4 w-4" />気づきを書く</Button>
        </div>
        <div className="mt-9 space-y-4">
          {isLoading ? [1,2,3].map(item => <div key={item} className="editorial-card rounded-2xl border border-white/80 p-6"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-20 w-full" /></div></div></div>) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">気づきを読み込めませんでした。ページを再読み込みしてください。</div>
          ) : !data?.length ? (
            <div className="editorial-card flex flex-col items-center rounded-[2rem] border border-white/80 px-6 py-16 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><Lightbulb className="h-6 w-6" /></div><h2 className="page-title mt-6 text-xl font-semibold">最初の気づきを共有しましょう</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">気づきが蓄積されるほど、チームの仕事を見直すきっかけが増えていきます。</p><Button onClick={() => navigate("/insights/new")} className="mt-6 rounded-xl">気づきを書く</Button></div>
          ) : data.map(item => (
            <article key={item.id} className="editorial-card rounded-[1.5rem] border border-white/80 p-5 sm:p-7">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 border border-white shadow-sm"><AvatarFallback className="bg-accent font-semibold text-primary">{item.authorName.charAt(0)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{item.authorName}</p><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("ja-JP", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}</time></div>
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-foreground/90">{item.content}</p>
                  <div className="mt-5 flex flex-wrap gap-2">{reactions.map(reaction => { const active = item.myReactions.includes(reaction.key); const count = item.reactionCounts[reaction.key]; return <button key={reaction.key} title={reaction.label} aria-pressed={active} onClick={() => toggle.mutate({ insightId:item.id, reaction:reaction.key })} className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${active ? "border-primary/25 bg-accent text-primary shadow-sm" : "border-border/70 bg-white/50 text-muted-foreground hover:bg-white"}`}><span aria-hidden>{reaction.emoji}</span><span>{count}</span></button>; })}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
