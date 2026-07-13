import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BookOpen, Clock3, Lightbulb, PenLine, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#173f3a] px-7 py-10 text-white sm:px-11 sm:py-14 lg:grid lg:grid-cols-[1.35fr_.65fr] lg:gap-10">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #e3c383 0 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
          <div className="relative"><p className="text-[#e3c383] text-xs font-bold tracking-[0.2em]">TEAM KNOWLEDGE BASE</p><h1 className="mt-5 page-title text-4xl font-semibold leading-[1.35] sm:text-5xl">今日の気づきが、<br />明日の標準になる。</h1><p className="mt-6 max-w-xl text-sm leading-7 text-white/65 sm:text-base">日々の小さな発見と、実践から生まれた改善を記録しましょう。共有された知恵が、次のより良い仕事につながります。</p><div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => navigate("/insights/new")} className="h-11 rounded-xl bg-[#e0bd79] text-[#173f3a] hover:bg-[#ebcb8c]"><PenLine className="mr-2 h-4 w-4" />気づきを書く</Button><Button onClick={() => navigate("/improvements/new")} variant="outline" className="h-11 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Sparkles className="mr-2 h-4 w-4" />改善事例を作る</Button></div></div>
          <div className="relative mt-10 grid grid-cols-3 gap-2 self-end lg:mt-0 lg:grid-cols-1">
            {[{label:"気づき",value:stats?.insightCount ?? 0,icon:Lightbulb},{label:"改善事例",value:stats?.improvementCount ?? 0,icon:BookOpen},{label:"削減時間",value:`${stats?.savedMinutes ?? 0}分`,icon:Clock3}].map(item => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur"><item.icon className="mb-3 h-4 w-4 text-[#e3c383]" /><p className="text-xl font-semibold sm:text-2xl">{isLoading ? "—" : item.value}</p><p className="mt-1 text-[11px] text-white/50">{item.label}</p></div>)}
          </div>
        </section>

        <section><div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">Start here</p><h2 className="page-title mt-2 text-2xl font-semibold sm:text-3xl">知恵を、次の行動へ</h2></div></div><div className="grid gap-4 md:grid-cols-2">{[{title:"現場の気づきを残す",text:"ふと感じた違和感や、もっと良くできそうなことを短い言葉で記録します。",path:"/insights/new",icon:PenLine,label:"投稿する"},{title:"改善の成果を共有する",text:"ビフォーとアフターを入力し、統一デザインの事例画像としてチームへ公開します。",path:"/improvements/new",icon:Sparkles,label:"事例を作る"}].map(card => <button key={card.path} onClick={() => navigate(card.path)} className="editorial-card group text-left rounded-[1.5rem] border border-white/80 p-6 sm:p-8 hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(23,63,58,.5)]"><div className="mb-8 grid h-11 w-11 place-items-center rounded-xl bg-[#dce9e4] text-[#173f3a]"><card.icon className="h-5 w-5" /></div><h3 className="page-title text-xl font-semibold">{card.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{card.text}</p><span className="mt-6 inline-flex items-center text-sm font-semibold text-primary">{card.label}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></button>)}</div></section>
      </div>
    </div>
  );
}
