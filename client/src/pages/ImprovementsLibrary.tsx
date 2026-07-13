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
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BookOpen, Clock3, ExternalLink, PlusCircle, Trash2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ImprovementsLibrary() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.improvements.listPublished.useQuery();
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

        <div className="mt-9">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map(item => <div key={item} className="editorial-card overflow-hidden rounded-[1.5rem] border border-white/80"><Skeleton className="aspect-[4/3] w-full rounded-none" /><div className="space-y-3 p-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-full" /></div></div>)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">改善事例を読み込めませんでした。ページを再読み込みしてください。</div>
          ) : !data?.length ? (
            <div className="editorial-card flex flex-col items-center rounded-[2rem] border border-white/80 px-6 py-16 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><BookOpen className="h-6 w-6" /></div><h2 className="page-title mt-6 text-xl font-semibold">最初の改善事例を作りましょう</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">改善のビフォー・アフターを可視化すると、チームで学びやすくなります。</p><Button onClick={() => navigate("/improvements/new")} className="mt-6 rounded-xl">改善事例を作る</Button></div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {data.map(item => {
                const saved = Math.max(0, item.beforeMinutes - item.afterMinutes);
                const rate = Math.max(0, Math.round(saved / item.beforeMinutes * 100));
                const canDelete = user?.id === item.authorId;
                return (
                  <article key={item.id} className="editorial-card group overflow-hidden rounded-[1.5rem] border border-white/80 hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(29,78,216,.4)]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-accent/50">
                      {item.imageUrl ? <img src={item.imageUrl} alt={`${item.title}の改善事例`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : null}
                      <div className="absolute bottom-3 left-3 flex gap-2"><span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur"><TrendingDown className="mr-1.5 h-3.5 w-3.5" />{rate}%短縮</span><span className="inline-flex items-center rounded-full bg-accent/95 px-3 py-1.5 text-xs font-semibold text-primary"><Clock3 className="mr-1.5 h-3.5 w-3.5" />{saved}分削減</span></div>
                    </div>
                    <div className="p-5">
                      <h2 className="line-clamp-2 text-base font-semibold leading-6">{item.title}</h2>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.problem}</p>
                      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-accent/50 p-3 text-center"><div><p className="text-[10px] font-bold tracking-wider text-muted-foreground">BEFORE</p><p className="mt-1 text-base font-semibold">{item.beforeMinutes}分</p></div><ArrowRight className="h-4 w-4 text-primary/50" /><div><p className="text-[10px] font-bold tracking-wider text-primary">AFTER</p><p className="mt-1 text-base font-semibold text-primary">{item.afterMinutes}分</p></div></div>

                      {(item.workUrl || canDelete) && <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                        {item.workUrl && <Button asChild variant="outline" size="sm" className="rounded-lg bg-white/60"><a href={item.workUrl} target="_blank" rel="noopener noreferrer">制作物を開く<ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>}
                        {canDelete && <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />削除</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>この改善事例を削除しますか？</AlertDialogTitle><AlertDialogDescription>「{item.title}」をライブラリから削除します。この操作は取り消せません。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => removeCase.mutate({ id: item.id })} disabled={removeCase.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">削除する</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
                      </div>}

                      <div className="mt-4 flex items-center justify-between"><div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-accent text-[10px] text-primary">{(item.authorName || "メ").charAt(0)}</AvatarFallback></Avatar><span className="text-xs text-muted-foreground">{item.authorName || "メンバー"}</span></div><time className="text-[11px] text-muted-foreground">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) : ""}</time></div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
