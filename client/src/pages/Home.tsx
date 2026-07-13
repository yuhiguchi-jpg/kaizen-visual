import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatDuration } from "@shared/improvementTime";
import { ArrowRight, BookOpen, Clock3, Lightbulb, PenLine, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const actions = [
  {
    title: "現場の気づきを残す",
    text: "違和感や、もっと良くできそうなことを短い言葉で記録します。",
    path: "/insights/new",
    icon: PenLine,
    label: "気づきを投稿",
  },
  {
    title: "改善の成果を共有する",
    text: "ビフォーとアフターを入力し、統一デザインの事例画像として公開します。",
    path: "/improvements/new",
    icon: Sparkles,
    label: "改善事例を作成",
  },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const statItems = [
    { label: "共有された気づき", value: stats?.insightCount ?? 0, unit: "件", icon: Lightbulb },
    { label: "公開された改善事例", value: stats?.improvementCount ?? 0, unit: "件", icon: BookOpen },
    { label: "年間削減時間", value: formatDuration(stats?.annualSavedSeconds ?? 0), unit: "", icon: Clock3 },
  ];

  return (
    <div className="knowledge-canvas min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Overview</p>
            <h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">ホーム</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              現場の気づきと改善の成果を、チームで共有・蓄積するナレッジスペースです。
            </p>
          </div>
          <Button onClick={() => navigate("/insights/new")} className="h-11 rounded-xl px-5">
            <PenLine className="mr-2 h-4 w-4" />気づきを書く
          </Button>
        </header>

        <section aria-labelledby="summary-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="summary-heading" className="text-sm font-semibold">チームの蓄積</h2>
            <span className="text-xs text-muted-foreground">現在の集計</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {statItems.map(item => (
              <div key={item.label} className="editorial-card rounded-[1.4rem] border border-white/80 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                      {isLoading ? "—" : item.value}<span className="ml-1 text-sm font-medium text-muted-foreground">{item.unit}</span>
                    </p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="action-heading">
          <div className="mb-5">
            <p className="eyebrow">Quick actions</p>
            <h2 id="action-heading" className="page-title mt-2 text-2xl font-semibold sm:text-3xl">次のアクション</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {actions.map(action => (
              <button key={action.path} onClick={() => navigate(action.path)} className="editorial-card group text-left rounded-[1.5rem] border border-white/80 p-6 hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(29,78,216,.38)] sm:p-8">
                <div className="mb-7 grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
                  <action.icon className="h-5 w-5" />
                </div>
                <h3 className="page-title text-xl font-semibold">{action.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{action.text}</p>
                <span className="mt-6 inline-flex items-center text-sm font-semibold text-primary">
                  {action.label}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
