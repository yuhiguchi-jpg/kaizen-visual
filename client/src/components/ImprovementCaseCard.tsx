import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { calculateReductionRate, formatDuration, formatFrequency, type FrequencyPeriod } from "@shared/improvementTime";
import { ArrowRight, Clock3, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  problem: string;
  beforeSeconds: number;
  afterSeconds: number;
  frequencyCount: number;
  frequencyPeriod: FrequencyPeriod;
  annualSavedSeconds: number;
  authorName: string;
  authorInitial: string;
  dateLabel: string;
  imageArea?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function ImprovementCaseCard({ title, problem, beforeSeconds, afterSeconds, frequencyCount, frequencyPeriod, annualSavedSeconds, authorName, authorInitial, dateLabel, imageArea, actions, className }: Props) {
  const rate = calculateReductionRate(beforeSeconds, afterSeconds);

  return (
    <article data-improvement-card className={cn("editorial-card group flex h-[38rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/80 hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(29,78,216,.4)]", className)}>
      <div data-improvement-card-image className="relative h-[17rem] shrink-0 overflow-hidden bg-accent/50">
        {imageArea}
        <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur"><TrendingDown className="mr-1.5 h-3.5 w-3.5" />{rate}%短縮</span>
          <span className="inline-flex items-center rounded-full bg-accent/95 px-3 py-1.5 text-xs font-semibold text-primary"><Clock3 className="mr-1.5 h-3.5 w-3.5" />年間 {formatDuration(annualSavedSeconds)}削減</span>
        </div>
      </div>
      <div data-improvement-card-body className="flex h-[21rem] flex-col p-5">
        <h2 className="line-clamp-2 h-12 shrink-0 overflow-hidden text-base font-semibold leading-6">{title}</h2>
        <p className="mt-2 line-clamp-2 h-10 shrink-0 overflow-hidden text-xs leading-5 text-muted-foreground">{problem}</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-accent/50 p-3 text-center">
          <div><p className="text-[10px] font-bold tracking-wider text-muted-foreground">BEFORE</p><p className="mt-1 text-base font-semibold">{formatDuration(beforeSeconds)}</p></div>
          <ArrowRight className="h-4 w-4 text-primary/50" />
          <div><p className="text-[10px] font-bold tracking-wider text-primary">AFTER</p><p className="mt-1 text-base font-semibold text-primary">{formatDuration(afterSeconds)}</p></div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">発生頻度：{formatFrequency(frequencyCount, frequencyPeriod)}</p>
        <div data-improvement-card-actions className="mt-4 flex h-14 shrink-0 flex-nowrap items-start gap-2 overflow-hidden border-t border-border/60 pt-4">{actions}</div>
        <div data-improvement-card-author className="mt-auto flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-accent text-[10px] text-primary">{authorInitial}</AvatarFallback></Avatar><span className="text-xs text-muted-foreground">{authorName}</span></div>
          <time className="text-[11px] text-muted-foreground">{dateLabel}</time>
        </div>
      </div>
    </article>
  );
}
