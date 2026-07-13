import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatDisplayName } from "@shared/displayName";
import {
  clampImprovementImageZoom,
  IMPROVEMENT_IMAGE_ZOOM,
} from "../../../shared/improvementLibrary";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ViewerImage = {
  src: string;
  title: string;
};

export default function ImprovementsLibrary() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewerImage, setViewerImage] = useState<ViewerImage | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const listInput = useMemo(
    () => ({ query: debouncedQuery || undefined }),
    [debouncedQuery],
  );
  const { data, isLoading, isFetching, error } = trpc.improvements.listPublished.useQuery(listInput);
  const removeCase = trpc.improvements.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.improvements.listPublished.invalidate(),
        utils.dashboard.stats.invalidate(),
      ]);
      toast.success("改善事例を削除しました");
    },
    onError: error => toast.error(error.message || "改善事例を削除できませんでした"),
  });

  const closeViewer = () => {
    setViewerImage(null);
    setZoom(1);
  };

  const changeZoom = (amount: number) => {
    setZoom(current => clampImprovementImageZoom(current + amount));
  };

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Improvement library</p>
            <h1 className="page-title mt-3 text-3xl font-semibold sm:text-4xl">改善ライブラリ</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">チームで実践した改善を、再利用できるナレッジとして蓄積しています。</p>
          </div>
          <Button onClick={() => navigate("/improvements/new")} className="h-11 rounded-xl">
            <PlusCircle className="mr-2 h-4 w-4" />改善事例を作る
          </Button>
        </div>

        <section className="mt-8 rounded-[1.5rem] border border-white/80 bg-white/70 p-4 shadow-[0_18px_50px_-38px_rgba(29,78,216,.55)] backdrop-blur sm:p-5" aria-label="改善事例を検索">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="タイトル・投稿者・事例内容・制作物URLで検索"
                aria-label="改善事例を検索"
                className="h-11 rounded-xl bg-background/85 pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="検索語をクリア"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex min-w-fit items-center justify-between gap-3 text-xs text-muted-foreground sm:justify-end">
              <span aria-live="polite">
                {isFetching && !isLoading ? "検索中…" : `${data?.length ?? 0}件の事例`}
              </span>
              {debouncedQuery && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-9 rounded-lg px-3">
                  検索を解除
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map(item => <div key={item} className="editorial-card overflow-hidden rounded-[1.5rem] border border-white/80"><Skeleton className="aspect-[4/3] w-full rounded-none" /><div className="space-y-3 p-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-full" /></div></div>)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">改善事例を読み込めませんでした。ページを再読み込みしてください。</div>
          ) : !data?.length ? (
            debouncedQuery ? (
              <div className="editorial-card flex flex-col items-center rounded-[2rem] border border-white/80 px-6 py-16 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><Search className="h-6 w-6" /></div><h2 className="page-title mt-6 text-xl font-semibold">該当する改善事例がありません</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">検索語を短くするか、タイトル・投稿者名・事例内容など別の言葉でお試しください。</p><Button variant="outline" onClick={() => setSearchQuery("")} className="mt-6 rounded-xl bg-white/60">検索を解除</Button></div>
            ) : (
              <div className="editorial-card flex flex-col items-center rounded-[2rem] border border-white/80 px-6 py-16 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><BookOpen className="h-6 w-6" /></div><h2 className="page-title mt-6 text-xl font-semibold">最初の改善事例を作りましょう</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">改善のビフォー・アフターを可視化すると、チームで学びやすくなります。</p><Button onClick={() => navigate("/improvements/new")} className="mt-6 rounded-xl">改善事例を作る</Button></div>
            )
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {data.map(item => {
                const saved = Math.max(0, item.beforeMinutes - item.afterMinutes);
                const rate = Math.max(0, Math.round(saved / item.beforeMinutes * 100));
                const canDelete = user?.id === item.authorId;
                return (
                  <article key={item.id} data-improvement-card className="editorial-card group flex h-[38rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/80 hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(29,78,216,.4)]">
                    <div data-improvement-card-image className="relative h-[17rem] shrink-0 overflow-hidden bg-accent/50">
                      {item.imageUrl ? (
                        <button type="button" onClick={() => { setViewerImage({ src: item.imageUrl!, title: item.title }); setZoom(1); }} aria-label={`「${item.title}」の画像を全画面表示`} className="h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary">
                          <img src={item.imageUrl} alt={`${item.title}の改善事例`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><Maximize2 className="mr-1.5 h-3.5 w-3.5" />全画面</span>
                        </button>
                      ) : null}
                      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2"><span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur"><TrendingDown className="mr-1.5 h-3.5 w-3.5" />{rate}%短縮</span><span className="inline-flex items-center rounded-full bg-accent/95 px-3 py-1.5 text-xs font-semibold text-primary"><Clock3 className="mr-1.5 h-3.5 w-3.5" />{saved}分削減</span></div>
                    </div>
                    <div data-improvement-card-body className="flex h-[21rem] flex-col p-5">
                      <h2 className="line-clamp-2 h-12 shrink-0 overflow-hidden text-base font-semibold leading-6">{item.title}</h2>
                      <p className="mt-2 line-clamp-2 h-10 shrink-0 overflow-hidden text-xs leading-5 text-muted-foreground">{item.problem}</p>
                      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-accent/50 p-3 text-center"><div><p className="text-[10px] font-bold tracking-wider text-muted-foreground">BEFORE</p><p className="mt-1 text-base font-semibold">{item.beforeMinutes}分</p></div><ArrowRight className="h-4 w-4 text-primary/50" /><div><p className="text-[10px] font-bold tracking-wider text-primary">AFTER</p><p className="mt-1 text-base font-semibold text-primary">{item.afterMinutes}分</p></div></div>

                      <div data-improvement-card-actions className="mt-4 flex h-14 shrink-0 flex-nowrap items-start gap-2 overflow-hidden border-t border-border/60 pt-4">
                        {item.workUrl && <Button asChild variant="outline" size="sm" className="rounded-lg bg-white/60"><a href={item.workUrl} target="_blank" rel="noopener noreferrer">制作物を開く<ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>}
                        {canDelete && <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />削除</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>この改善事例を削除しますか？</AlertDialogTitle><AlertDialogDescription>「{item.title}」をライブラリから削除します。この操作は取り消せません。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => removeCase.mutate({ id: item.id })} disabled={removeCase.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">削除する</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
                      </div>

                      <div data-improvement-card-author className="mt-auto flex shrink-0 items-center justify-between"><div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-accent text-[10px] text-primary">{formatDisplayName(item.authorName, "メ").charAt(0)}</AvatarFallback></Avatar><span className="text-xs text-muted-foreground">{formatDisplayName(item.authorName, "メンバー")}</span></div><time className="text-[11px] text-muted-foreground">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) : ""}</time></div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(viewerImage)} onOpenChange={open => { if (!open) closeViewer(); }}>
        <DialogContent showCloseButton={false} className="block overflow-hidden rounded-none border-0 bg-slate-950 p-0 text-white shadow-none" style={{ width: "100vw", maxWidth: "none", height: "100dvh" }}>
          <DialogTitle className="sr-only">{viewerImage?.title ?? "改善事例画像"}の全画面表示</DialogTitle>
          <DialogDescription className="sr-only">拡大、縮小、リセット操作を使って画像を確認できます。</DialogDescription>

          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent p-4 pb-10 sm:p-6 sm:pb-12">
            <div className="min-w-0 pt-1"><p className="truncate text-sm font-semibold sm:text-base">{viewerImage?.title}</p><p className="mt-1 text-xs text-white/65">画像上でホイール操作でも拡大・縮小できます</p></div>
            <Button type="button" variant="ghost" size="icon" onClick={closeViewer} aria-label="全画面表示を閉じる" className="shrink-0 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"><X className="h-5 w-5" /></Button>
          </div>

          <div className="flex h-full w-full items-center justify-center overflow-hidden px-3 py-24 sm:px-8" onWheel={event => { event.preventDefault(); changeZoom(event.deltaY < 0 ? IMPROVEMENT_IMAGE_ZOOM.step : -IMPROVEMENT_IMAGE_ZOOM.step); }}>
            {viewerImage && <img src={viewerImage.src} alt={`${viewerImage.title}の改善事例（全画面表示）`} draggable={false} className="max-h-full max-w-full select-none object-contain transition-transform duration-200" style={{ transform: `scale(${zoom})` }} />}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/85 to-transparent p-4 pt-10 sm:p-6 sm:pt-12">
            <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-black/55 p-1.5 shadow-2xl backdrop-blur-xl">
              <Button type="button" variant="ghost" size="icon" onClick={() => changeZoom(-IMPROVEMENT_IMAGE_ZOOM.step)} disabled={zoom <= IMPROVEMENT_IMAGE_ZOOM.min} aria-label="縮小" className="rounded-xl text-white hover:bg-white/15 hover:text-white disabled:text-white/30"><Minus className="h-5 w-5" /></Button>
              <span className="w-16 text-center text-xs font-semibold tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => changeZoom(IMPROVEMENT_IMAGE_ZOOM.step)} disabled={zoom >= IMPROVEMENT_IMAGE_ZOOM.max} aria-label="拡大" className="rounded-xl text-white hover:bg-white/15 hover:text-white disabled:text-white/30"><Plus className="h-5 w-5" /></Button>
              <div className="mx-1 h-6 w-px bg-white/15" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setZoom(1)} disabled={zoom === 1} className="rounded-xl px-3 text-white hover:bg-white/15 hover:text-white disabled:text-white/30"><RotateCcw className="mr-2 h-4 w-4" />リセット</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
