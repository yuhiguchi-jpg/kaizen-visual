import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  calculateAnnualSavedSeconds,
  calculateReductionRate,
  formatDuration,
  type FrequencyPeriod,
} from "@shared/improvementTime";
import { ArrowRight, Check, Clock3, Image as ImageIcon, Link2, Loader2, RotateCw, Save, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type FormState = {
  title: string;
  workUrl: string;
  originalMethod: string;
  problem: string;
  beforeHours: string;
  beforeMinutes: string;
  beforeSeconds: string;
  solution: string;
  afterHours: string;
  afterMinutes: string;
  afterSeconds: string;
  frequencyCount: string;
  frequencyPeriod: FrequencyPeriod;
};

const initialForm: FormState = {
  title: "",
  workUrl: "",
  originalMethod: "",
  problem: "",
  beforeHours: "0",
  beforeMinutes: "0",
  beforeSeconds: "0",
  solution: "",
  afterHours: "0",
  afterMinutes: "0",
  afterSeconds: "0",
  frequencyCount: "",
  frequencyPeriod: "day",
};

function toTotalSeconds(hours: string, minutes: string, seconds: string) {
  return Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
}

function isValidTimeParts(hours: string, minutes: string, seconds: string) {
  const values = [hours, minutes, seconds].map(value => Number(value || 0));
  return values.every(Number.isInteger) && values[0] >= 0 && values[1] >= 0 && values[1] <= 59 && values[2] >= 0 && values[2] <= 59;
}

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
    beforeSeconds: toTotalSeconds(form.beforeHours, form.beforeMinutes, form.beforeSeconds),
    solution: form.solution.trim(),
    afterSeconds: toTotalSeconds(form.afterHours, form.afterMinutes, form.afterSeconds),
    frequencyCount: Number(form.frequencyCount),
    frequencyPeriod: form.frequencyPeriod,
  }), [form]);
  const validTimeParts = isValidTimeParts(form.beforeHours, form.beforeMinutes, form.beforeSeconds)
    && isValidTimeParts(form.afterHours, form.afterMinutes, form.afterSeconds);
  const isValid = Boolean(
    payload.title
    && payload.originalMethod
    && payload.problem
    && payload.solution
    && validTimeParts
    && payload.beforeSeconds > 0
    && payload.afterSeconds >= 0
    && Number.isInteger(payload.frequencyCount)
    && payload.frequencyCount > 0,
  );
  const annualSavedSeconds = isValid ? calculateAnnualSavedSeconds(payload) : 0;
  const reductionRate = isValid ? calculateReductionRate(payload.beforeSeconds, payload.afterSeconds) : 0;

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
    onSuccess: async () => {
      await Promise.all([utils.improvements.listPublished.invalidate(), utils.dashboard.stats.invalidate()]);
      toast.success("改善事例を公開しました");
      navigate("/improvements");
    },
    onError: error => toast.error(error.message || "公開できませんでした"),
  });

  const update = <FieldName extends keyof FormState>(field: FieldName, value: FormState[FieldName]) => {
    setForm(current => ({ ...current, [field]: value }));
    if (field !== "workUrl") setImageUrl(undefined);
  };

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="eyebrow">Create case study</p>
          <h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">改善事例を作る</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">改善前後の事実を入力すると、共有しやすい統一デザインの事例画像をAIが作成します。入力データは分析可能な形で蓄積されます。</p>
        </div>
        <div className="mt-9 grid gap-6 xl:grid-cols-[1.08fr_.92fr] xl:items-start">
          <div className="space-y-5">
            <section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7">
              <div className="mb-5"><p className="eyebrow">Case title</p><h2 className="mt-2 text-lg font-semibold">資料のタイトル</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">ここで入力したタイトルが、生成画像の最上部に表示されます。</p></div>
              <Field label="タイトル"><Input value={form.title} onChange={event => update("title", event.target.value)} maxLength={160} placeholder="例：月次報告の集計時間を81％短縮" className="h-12 rounded-xl bg-white/60 text-base" /></Field>
              <p className="mt-2 text-right text-[11px] text-muted-foreground">{form.title.length} / 160</p>
            </section>

            <section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7">
              <StepHeading number="1" title="BEFORE" description="改善前の状態" />
              <div className="space-y-5">
                <Field label="元々どのように進めていましたか？"><Textarea value={form.originalMethod} onChange={event => update("originalMethod", event.target.value)} placeholder="例：毎週、各担当者からExcelをメールで回収し、手作業で1つの表に転記していた" className="min-h-28 rounded-xl bg-white/60 leading-7" /></Field>
                <Field label="どんな課題がありましたか？"><Textarea value={form.problem} onChange={event => update("problem", event.target.value)} placeholder="例：ファイルの回収漏れや転記ミスが発生し、確認にも時間がかかっていた" className="min-h-28 rounded-xl bg-white/60 leading-7" /></Field>
                <Field label="1回あたりにかかっていた時間"><TimeInput hours={form.beforeHours} minutes={form.beforeMinutes} seconds={form.beforeSeconds} onHoursChange={value => update("beforeHours", value)} onMinutesChange={value => update("beforeMinutes", value)} onSecondsChange={value => update("beforeSeconds", value)} /></Field>
              </div>
            </section>

            <section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7">
              <StepHeading number="2" title="AFTER" description="改善後の状態" />
              <div className="space-y-5">
                <Field label="どのように解決しましたか？"><Textarea value={form.solution} onChange={event => update("solution", event.target.value)} placeholder="例：共有フォームから各担当者が直接入力し、集計表へ自動反映する仕組みに変更した" className="min-h-32 rounded-xl bg-white/60 leading-7" /></Field>
                <Field label="改善後にかかる時間"><TimeInput hours={form.afterHours} minutes={form.afterMinutes} seconds={form.afterSeconds} onHoursChange={value => update("afterHours", value)} onMinutesChange={value => update("afterMinutes", value)} onSecondsChange={value => update("afterSeconds", value)} /></Field>
                <Field label="発生頻度">
                  <div className="grid max-w-md grid-cols-[minmax(0,1fr)_minmax(9rem,1fr)] gap-3">
                    <div className="relative"><Input type="number" min="1" step="1" value={form.frequencyCount} onChange={event => update("frequencyCount", event.target.value)} placeholder="例：5" className="h-11 rounded-xl bg-white/60 pr-10" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">回</span></div>
                    <Select value={form.frequencyPeriod} onValueChange={value => update("frequencyPeriod", value as FrequencyPeriod)}><SelectTrigger className="h-11 rounded-xl bg-white/60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">1日あたり</SelectItem><SelectItem value="week">1週間あたり</SelectItem><SelectItem value="month">1か月あたり</SelectItem><SelectItem value="year">1年あたり</SelectItem></SelectContent></Select>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">この作業が選択した期間内に何回発生するか入力してください。</p>
                </Field>
                {isValid && <div className="grid grid-cols-2 gap-3 rounded-2xl bg-accent p-4"><div><p className="text-xs text-muted-foreground">年間削減時間</p><p className="mt-1 text-xl font-semibold text-primary">{formatDuration(annualSavedSeconds)}</p></div><div><p className="text-xs text-muted-foreground">1回あたりの短縮率</p><p className="mt-1 text-xl font-semibold text-primary">{reductionRate}%</p></div></div>}
              </div>
            </section>

            <section className="editorial-card rounded-[1.7rem] border border-white/80 p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-primary"><Link2 className="h-4 w-4" /></span><div><p className="font-semibold">制作物・デモへのリンク</p><p className="mt-1 text-xs leading-6 text-muted-foreground">任意項目です。資料画像には入りませんが、ライブラリの事例カードから開けるようになります。</p></div></div>
              <Field label="URL（任意）"><Input type="url" value={form.workUrl} onChange={event => update("workUrl", event.target.value)} maxLength={2048} placeholder="https://example.com/demo" className="h-12 rounded-xl bg-white/60 text-base" /></Field>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => saveDraft.mutate({ ...payload, id: draftId })} disabled={!isValid || saveDraft.isPending || generate.isPending} className="h-11 rounded-xl bg-white/50"><Save className="mr-2 h-4 w-4" />{saveDraft.isPending ? "保存中…" : "下書き保存"}</Button><Button onClick={() => generate.mutate({ ...payload, id: draftId })} disabled={!isValid || generate.isPending || saveDraft.isPending} className="h-11 rounded-xl px-5 shadow-[0_14px_30px_-18px_rgba(29,78,216,.65)]">{generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{generate.isPending ? "画像を生成中…" : "AIで画像を生成"}</Button></div>
          </div>

          <aside className="xl:sticky xl:top-8"><div className="editorial-card overflow-hidden rounded-[1.7rem] border border-white/80"><div className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-primary" />プレビュー</div>{imageUrl && draftId ? <Button variant="ghost" size="sm" onClick={() => regenerate.mutate({ id: draftId })} disabled={regenerate.isPending} className="rounded-lg text-xs"><RotateCw className={`mr-2 h-3.5 w-3.5 ${regenerate.isPending ? "animate-spin" : ""}`} />再生成</Button> : null}</div><div className="aspect-[4/3] bg-accent/50">{generate.isPending || regenerate.isPending ? <div className="flex h-full flex-col items-center justify-center px-8 text-center"><div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/70 text-primary"><Sparkles className="h-7 w-7 animate-pulse" /><div className="absolute -inset-2 rounded-3xl border border-primary/10" /></div><p className="mt-6 font-semibold">事例をデザインしています</p><p className="mt-2 text-xs leading-6 text-muted-foreground">入力内容を整理し、統一されたビジュアルへ変換中です。</p></div> : imageUrl ? <img src={imageUrl} alt={`${payload.title}の改善事例`} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center px-8 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-primary/30 text-primary/60"><ImageIcon className="h-6 w-6" /></div><p className="mt-5 text-sm font-semibold">ここに生成画像が表示されます</p><p className="mt-2 max-w-xs text-xs leading-6 text-muted-foreground">すべての項目を入力し「AIで画像を生成」を押してください。</p></div>}</div>{imageUrl && draftId ? <div className="border-t border-border/60 p-5"><Button onClick={() => publish.mutate({ id: draftId })} disabled={publish.isPending} className="h-11 w-full rounded-xl">{publish.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}この事例を公開する<ArrowRight className="ml-2 h-4 w-4" /></Button></div> : null}</div></aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label className="text-sm font-semibold">{label}</Label>{children}</div>;
}

function StepHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-primary">{number}</span><div><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div>;
}

function TimeInput({ hours, minutes, seconds, onHoursChange, onMinutesChange, onSecondsChange }: {
  hours: string;
  minutes: string;
  seconds: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onSecondsChange: (value: string) => void;
}) {
  return <div className="grid max-w-md grid-cols-3 gap-3"><TimePartInput label="時" value={hours} onChange={onHoursChange} min={0} /><TimePartInput label="分" value={minutes} onChange={onMinutesChange} min={0} max={59} /><TimePartInput label="秒" value={seconds} onChange={onSecondsChange} min={0} max={59} /></div>;
}

function TimePartInput({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min: number; max?: number }) {
  return <div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={label} type="number" min={min} max={max} step="1" value={value} onChange={event => onChange(event.target.value)} className="h-11 rounded-xl bg-white/60 pl-9 pr-8" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{label}</span></div>;
}
