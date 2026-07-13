import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { INSIGHT_GENRES, type InsightGenre } from "@shared/insightGenres";
import { ArrowRight, Lightbulb, Loader2, Tags } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function InsightWrite() {
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState<InsightGenre | "">("");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const create = trpc.insights.create.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.insights.list.invalidate(), utils.dashboard.stats.invalidate()]);
      toast.success("気づきを共有しました");
      navigate("/insights");
    },
    onError: error => toast.error(error.message || "投稿できませんでした"),
  });

  return (
    <div className="knowledge-canvas min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">New insight</p>
        <h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">気づきを書く</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">DXの導入・定着支援や伴走の現場で得た、小さな違和感や発見を残してください。</p>

        <div className="editorial-card mt-9 rounded-[2rem] border border-white/80 p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary"><Lightbulb className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">今日、何に気づきましたか？</p><p className="mt-1 text-xs text-muted-foreground">ジャンルを選び、一言から共有できます</p></div>
          </div>

          <div className="mb-5 space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="insight-genre"><Tags className="h-4 w-4 text-primary" />ジャンル</label>
            <Select value={genre} onValueChange={value => setGenre(value as InsightGenre)}>
              <SelectTrigger id="insight-genre" className="h-12 rounded-xl bg-white/60"><SelectValue placeholder="ジャンルを選択してください" /></SelectTrigger>
              <SelectContent>{INSIGHT_GENRES.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Textarea value={content} onChange={event => setContent(event.target.value)} placeholder="例：導入初期に担当者と小さな成功指標を合意しておくと、現場での定着が進みやすい。" className="min-h-48 resize-none rounded-2xl border-border/70 bg-white/60 p-5 text-base leading-8 shadow-inner focus-visible:ring-primary/30" maxLength={1000} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">{content.length} / 1000</span>
            <Button onClick={() => genre && create.mutate({ genre, content })} disabled={!genre || !content.trim() || create.isPending} className="h-11 rounded-xl px-5">
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}共有する<ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
