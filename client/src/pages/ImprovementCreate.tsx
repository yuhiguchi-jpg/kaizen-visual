import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, Clock3, Image as ImageIcon, Link2, Loader2, RotateCw, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type FormState = {
  title: string;
  workUrl: string;
  originalMethod: string;
  problem: string;
  beforeMinutes: string;
  solution: string;
  afterMinutes: string;
};

const initialForm: FormState = { title: "", workUrl: "", originalMethod: "", problem: "", beforeMinutes: "", solution: "", afterMinutes: "" };

export default function ImprovementCreate() {
  const [form, setForm] = useState(initialForm);
  const [draftId, setDraftId] = useState<number>();
  const [imageUrl, setImageUrl] = useState<string>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const payload = useMemo(() => ({
    title: form.title.trim(),
    workUrl: form.workUrl.trim() || undefined,
    originalMethod: form.originalMethod.trim(),
    problem: form.problem.trim(),
    beforeMinutes: Number(form.beforeMinutes),
    solution: form.solution.trim(),
    afterMinutes: Number(form.afterMinutes),
  }), [form]);
  const isValid = Boolean(payload.title && payload.originalMethod && payload.problem && payload.solution && payload.beforeMinutes > 0 && payload.afterMinutes >= 0 && form.afterMinutes !== "");
  const savedMinutes = isValid ? Math.max(0, payload.beforeMinutes - payload.afterMinutes) : 0;
  const reductionRate = isValid ? Math.max(0, Math.round(savedMinutes / payload.beforeMinutes * 100)) : 0;

  const saveDraft = trpc.improvements.saveDraft.useMutation({
    onSuccess: result => { setDraftId(result.id); toast.success("下書きを保存しました"); },
    onError: error => toast.error(error.message || "下書きを保存できませんでした"),
  });
  const generate = trpc.improvements.generate.useMutation({
    onSuccess: result => { setDraftId(result.id); setImageUrl(result.imageUrl); toast.success("改善事例の画像を生成しました"); },
    onError: error => toast.error(error.message || "画像を生成できませんでした"),
  });
  const regenerate = trpc.improvements.regenerate.useMutation({
    onSuccess: result => { setImageUrl(result.imageUrl); toast.success("画像を再生成しました"); },
    onError: error => toast.error(error.message || "画像を再生成できませんでした"),
  });
  const publish = trpc.improvements.publish.useMutation({
    onSuccess: async () => { await Promise.all([utils.improvements.listPublished.invalidate(), utils.dashboard.stats.invalidate()]); toast.success("改善事例を公開しました"); navigate("/improvements"); },
    onError: error => toast.error(error.message || "公開できませんでした"),
  });

  const update = (field: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    if (field !== "workUrl") setImageUrl(undefined);
  };

  return <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="eyebrow">Create case study</p><h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">改善事例を作る</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">改善前後の事実を入力すると、共有しやすい統一デザインの事例画像をAIが作成します。入力データは分析可能な形で蓄積されます。</p></div>
    <div className="mt-9 grid gap-6 xl:grid-cols-[1.08fr_.92fr] xl:items-start">
      <div className="space-y-5"><section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7"><div className="mb-5"><p className="eyebrow">Case title</p><h2 className="mt-2 text-lg font-semibold">資料のタイトル</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">ここで入力したタイトルが、生成画像の最上部に表示されます。</p></div><Field label="タイトル"><Input value={form.title} onChange={e => update("title", e.target.value)} maxLength={160} placeholder="例：月次報告の集計時間を81％短縮" className="h-12 rounded-xl bg-white/60 text-base" /></Field><p className="mt-2 text-right text-[11px] text-muted-foreground">{form.title.length} / 160</p></section><section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7"><div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span><div><p className="font-semibold">BEFORE</p><p className="text-xs text-muted-foreground">改善前の状態</p></div></div><div className="space-y-5"><Field label="元々どのように進めていましたか？"><Textarea value={form.originalMethod} onChange={e => update("originalMethod", e.target.value)} placeholder="例：毎週、各担当者からExcelをメールで回収し、手作業で1つの表に転記していた" className="min-h-28 rounded-xl bg-white/60 leading-7" /></Field><Field label="どんな課題がありましたか？"><Textarea value={form.problem} onChange={e => update("problem", e.target.value)} placeholder="例：ファイルの回収漏れや転記ミスが発生し、確認にも時間がかかっていた" className="min-h-28 rounded-xl bg-white/60 leading-7" /></Field><Field label="1回あたりにかかっていた時間"><TimeInput value={form.beforeMinutes} onChange={value => update("beforeMinutes", value)} /></Field></div></section>
      <section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7"><div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-primary">2</span><div><p className="font-semibold">AFTER</p><p className="text-xs text-muted-foreground">改善後の状態</p></div></div><div className="space-y-5"><Field label="どのように解決しましたか？"><Textarea value={form.solution} onChange={e => update("solution", e.target.value)} placeholder="例：共有フォームから各担当者が直接入力し、集計表へ自動反映する仕組みに変更した" className="min-h-32 rounded-xl bg-white/60 leading-7" /></Field><Field label="改善後にかかる時間"><TimeInput value={form.afterMinutes} onChange={value => update("afterMinutes", value)} /></Field>{isValid && <div className="grid grid-cols-2 gap-3 rounded-2xl bg-accent p-4"><div><p className="text-xs text-muted-foreground">削減時間</p><p className="mt-1 text-xl font-semibold text-primary">{savedMinutes}分</p></div><div><p className="text-xs text-muted-foreground">短縮率</p><p className="mt-1 text-xl font-semibold text-primary">{reductionRate}%</p></div></div>}</div></section>
      <section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7"><div className="mb-5 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-primary"><Link2 className="h-4 w-4" /></span><div><p className="font-semibold">制作物・デモへのリンク</p><p className="mt-1 text-xs leading-6 text-muted-foreground">任意項目です。資料画像には入りませんが、ライブラリの事例カードから開けるようになります。</p></div></div><Field label="URL（任意）"><Input type="url" value={form.workUrl} onChange={e => update("workUrl", e.target.value)} maxLength={2048} placeholder="https://example.com/demo" className="h-12 rounded-xl bg-white/60 text-base" /></Field></section>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => saveDraft.mutate({ ...payload, id:draftId })} disabled={!isValid || saveDraft.isPending || generate.isPending} className="h-11 rounded-xl bg-white/50"><Save className="mr-2 h-4 w-4" />{saveDraft.isPending ? "保存中…" : "下書き保存"}</Button><Button onClick={() => generate.mutate({ ...payload, id:draftId })} disabled={!isValid || generate.isPending || saveDraft.isPending} className="h-11 rounded-xl px-5 shadow-[0_14px_30px_-18px_rgba(29,78,216,.65)]">{generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{generate.isPending ? "画像を生成中…" : "AIで画像を生成"}</Button></div></div>
      <aside className="xl:sticky xl:top-8"><div className="editorial-card overflow-hidden rounded-[1.7rem] border border-white/80"><div className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-primary" />プレビュー</div>{imageUrl && draftId ? <Button variant="ghost" size="sm" onClick={() => regenerate.mutate({ id:draftId })} disabled={regenerate.isPending} className="rounded-lg text-xs"><RotateCw className={`mr-2 h-3.5 w-3.5 ${regenerate.isPending ? "animate-spin" : ""}`} />再生成</Button> : null}</div><div className="aspect-[4/3] bg-accent/50">{generate.isPending || regenerate.isPending ? <div className="flex h-full flex-col items-center justify-center px-8 text-center"><div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/70 text-primary"><Sparkles className="h-7 w-7 animate-pulse" /><div className="absolute -inset-2 rounded-3xl border border-primary/10" /></div><p className="mt-6 font-semibold">事例をデザインしています</p><p className="mt-2 text-xs leading-6 text-muted-foreground">入力内容を整理し、統一されたビジュアルへ変換中です。</p></div> : imageUrl ? <img src={imageUrl} alt={`${payload.title}の改善事例`} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center px-8 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-primary/30 text-primary/60"><ImageIcon className="h-6 w-6" /></div><p className="mt-5 text-sm font-semibold">ここに生成画像が表示されます</p><p className="mt-2 max-w-xs text-xs leading-6 text-muted-foreground">すべての項目を入力し「AIで画像を生成」を押してください。</p></div>}</div>{imageUrl && draftId ? <div className="border-t border-border/60 p-5"><Button onClick={() => publish.mutate({ id:draftId })} disabled={publish.isPending} className="h-11 w-full rounded-xl">{publish.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}この事例を公開する<ArrowRight className="ml-2 h-4 w-4" /></Button></div> : null}</div></aside>
    </div></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-sm font-semibold">{label}</Label>{children}</div>; }
function TimeInput({ value, onChange }: { value:string; onChange:(value:string) => void }) { return <div className="relative max-w-xs"><Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="number" min="0" step="1" value={value} onChange={e => onChange(e.target.value)} placeholder="30" className="h-11 rounded-xl bg-white/60 pl-10 pr-14" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">分</span></div>; }
