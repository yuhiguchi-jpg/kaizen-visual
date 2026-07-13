import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock3, ExternalLink, Heart, MessageCircle, TrendingDown } from "lucide-react";
import { useState } from "react";

const improvementSamples = [
  { id: 1, title: "制作物URLがある改善事例", problem: "定型作業に時間がかかり、確認工程も属人化していました。", workUrl: "https://example.com", author: "URLあり投稿者" },
  { id: 2, title: "制作物URLがない改善事例", problem: "同じカード高さと投稿者位置になることを確認するための表示です。", workUrl: null, author: "URLなし投稿者" },
];

export default function CardUiReview() {
  const [commentsOpen, setCommentsOpen] = useState(() => new URLSearchParams(window.location.search).get("comments") === "open");

  return (
    <main className="knowledge-canvas min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Development UI review</p>
        <h1 className="page-title mt-3 text-3xl font-semibold">カードUI確認</h1>
        <p className="mt-3 text-sm text-muted-foreground">このページは開発プレビューでのみ表示されます。</p>

        <section className="mt-8 max-w-3xl" aria-labelledby="insight-review-title">
          <h2 id="insight-review-title" className="text-lg font-semibold">気づきカード</h2>
          <article className="editorial-card mt-4 rounded-[1.5rem] border border-white/80 p-5 sm:p-7">
            <div className="flex gap-4">
              <Avatar className="h-10 w-10 border border-white shadow-sm"><AvatarFallback className="bg-accent font-semibold text-primary">確</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><p className="text-sm font-semibold">確認用投稿者</p><span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-primary">業務効率化</span></div><time className="text-xs text-muted-foreground">7月13日 10:00</time></div>
                <p className="mt-4 text-[15px] leading-8 text-foreground/90">いいねとコメントが必ず横並びになり、コメントを押した時だけ入力欄が展開されます。</p>
                <div className="mt-5">
                  <div data-insight-actions className="flex flex-wrap items-start justify-between gap-2 border-t border-border/60 pt-4">
                    <div data-insight-engagement className="inline-flex shrink-0 flex-nowrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 rounded-full border-border/70 bg-white/50 px-3 text-muted-foreground hover:bg-white"><Heart className="mr-2 h-4 w-4" />いいね 3</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setCommentsOpen(current => !current)} aria-expanded={commentsOpen} aria-controls="review-comments" className="h-9 shrink-0 rounded-full px-3 text-muted-foreground hover:bg-accent hover:text-primary"><MessageCircle className="mr-2 h-4 w-4" />コメント 1</Button>
                    </div>
                  </div>
                  {commentsOpen && <div id="review-comments" data-insight-comments-panel className="mt-4 rounded-2xl bg-muted/45 p-4 sm:p-5"><p className="text-sm font-semibold">コメント欄が展開されました</p><p className="mt-2 text-sm leading-6 text-muted-foreground">もう一度コメントボタンを押すと閉じます。</p><textarea aria-label="確認用コメント本文" placeholder="コメントを書く" className="mt-4 min-h-16 w-full resize-none rounded-xl border border-input bg-white/80 px-3 py-2 text-sm" /></div>}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-10" aria-labelledby="improvement-review-title">
          <h2 id="improvement-review-title" className="text-lg font-semibold">改善事例カード</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {improvementSamples.map(item => (
              <article key={item.id} data-improvement-card className="editorial-card group flex h-[38rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/80">
                <div data-improvement-card-image className="relative h-[17rem] shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-accent to-primary/20">
                  <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-primary/70">改善イメージ</div>
                  <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2"><span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground"><TrendingDown className="mr-1.5 h-3.5 w-3.5" />67%短縮</span><span className="inline-flex items-center rounded-full bg-accent/95 px-3 py-1.5 text-xs font-semibold text-primary"><Clock3 className="mr-1.5 h-3.5 w-3.5" />40分削減</span></div>
                </div>
                <div data-improvement-card-body className="flex h-[21rem] flex-col p-5">
                  <h3 className="line-clamp-2 h-12 shrink-0 overflow-hidden text-base font-semibold leading-6">{item.title}</h3>
                  <p className="mt-2 line-clamp-2 h-10 shrink-0 overflow-hidden text-xs leading-5 text-muted-foreground">{item.problem}</p>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-accent/50 p-3 text-center"><div><p className="text-[10px] font-bold tracking-wider text-muted-foreground">BEFORE</p><p className="mt-1 text-base font-semibold">60分</p></div><ArrowRight className="h-4 w-4 text-primary/50" /><div><p className="text-[10px] font-bold tracking-wider text-primary">AFTER</p><p className="mt-1 text-base font-semibold text-primary">20分</p></div></div>
                  <div data-improvement-card-actions className="mt-4 flex h-14 shrink-0 flex-nowrap items-start gap-2 overflow-hidden border-t border-border/60 pt-4">{item.workUrl && <Button asChild variant="outline" size="sm" className="rounded-lg bg-white/60"><a href={item.workUrl} target="_blank" rel="noopener noreferrer">制作物を開く<ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>}</div>
                  <div data-improvement-card-author className="mt-auto flex shrink-0 items-center justify-between"><div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-accent text-[10px] text-primary">投</AvatarFallback></Avatar><span className="text-xs text-muted-foreground">{item.author}</span></div><time className="text-[11px] text-muted-foreground">7月13日</time></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
