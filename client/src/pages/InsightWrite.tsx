import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Lightbulb, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function InsightWrite() {
  const [content, setContent] = useState("");
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

  return <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-3xl"><p className="eyebrow">New insight</p><h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">気づきを書く</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">完成された提案でなくても大丈夫です。現場で感じた小さな違和感や発見を、そのまま残してください。</p><div className="editorial-card mt-9 rounded-[2rem] border border-white/80 p-5 sm:p-8"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dce9e4] text-[#173f3a]"><Lightbulb className="h-5 w-5" /></div><div><p className="text-sm font-semibold">今日、何に気づきましたか？</p><p className="mt-1 text-xs text-muted-foreground">一言からでも投稿できます</p></div></div><Textarea value={content} onChange={event => setContent(event.target.value)} placeholder="例：定例会議の前に論点を共有しておくと、確認時間を短くできそうです。" className="min-h-48 resize-none rounded-2xl border-border/70 bg-white/60 p-5 text-base leading-8 shadow-inner focus-visible:ring-primary/30" maxLength={1000} /><div className="mt-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">{content.length} / 1000</span><Button onClick={() => create.mutate({ content })} disabled={!content.trim() || create.isPending} className="h-11 rounded-xl px-5">{create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}共有する<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div></div></div>;
}
