import ImprovementCaseCard from "@/components/ImprovementCaseCard";
import InsightEngagementBar from "@/components/InsightEngagementBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart, MessageCircle, Trash2 } from "lucide-react";
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
                <p className="mt-4 text-[15px] leading-8 text-foreground/90">本人投稿・削除ボタンありでも、いいねとコメントが横並びになり、コメントを押した時だけ入力欄が展開されます。</p>
                <InsightEngagementBar
                  likeAction={<Button type="button" variant="outline" size="sm" className="h-9 shrink-0 rounded-full border-border/70 bg-white/50 px-3 text-muted-foreground hover:bg-white"><Heart className="mr-2 h-4 w-4" />いいね 3</Button>}
                  commentAction={<Button type="button" variant="ghost" size="sm" onClick={() => setCommentsOpen(current => !current)} aria-expanded={commentsOpen} aria-controls="review-comments" className="h-9 shrink-0 rounded-full px-3 text-muted-foreground hover:bg-accent hover:text-primary"><MessageCircle className="mr-2 h-4 w-4" />コメント 1</Button>}
                  deleteAction={<Button type="button" variant="ghost" size="sm" className="shrink-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />削除</Button>}
                >
                  {commentsOpen && <div id="review-comments" data-insight-comments-panel className="mt-4 rounded-2xl bg-muted/45 p-4 sm:p-5"><p className="text-sm font-semibold">コメント欄が展開されました</p><p className="mt-2 text-sm leading-6 text-muted-foreground">もう一度コメントボタンを押すと閉じます。</p><textarea aria-label="確認用コメント本文" placeholder="コメントを書く" className="mt-4 min-h-16 w-full resize-none rounded-xl border border-input bg-white/80 px-3 py-2 text-sm" /></div>}
                </InsightEngagementBar>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-10" aria-labelledby="improvement-review-title">
          <h2 id="improvement-review-title" className="text-lg font-semibold">改善事例カード</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {improvementSamples.map(item => (
              <ImprovementCaseCard
                key={item.id}
                title={item.title}
                problem={item.problem}
                beforeMinutes={60}
                afterMinutes={20}
                authorName={item.author}
                authorInitial="投"
                dateLabel="7月13日"
                imageArea={<div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/10 via-accent to-primary/20 text-sm font-semibold text-primary/70">改善イメージ</div>}
                actions={item.workUrl ? <Button asChild variant="outline" size="sm" className="rounded-lg bg-white/60"><a href={item.workUrl} target="_blank" rel="noopener noreferrer">制作物を開く<ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button> : undefined}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
