import { cn } from "@/lib/utils";

type AppBrandProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

export default function AppBrand({ inverse = false, compact = false, className }: AppBrandProps) {
  return (
    <span
      aria-label="2G版 KAIZEN App"
      className={cn("inline-flex min-w-0 items-center gap-2", className)}
    >
      <span
        className={cn(
          "shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-extrabold leading-none tracking-[0.08em] shadow-sm",
          inverse
            ? "bg-white text-[#163e8a] shadow-black/10"
            : "bg-primary text-primary-foreground shadow-primary/20",
        )}
      >
        2G版
      </span>
      <span
        className={cn(
          "truncate whitespace-nowrap font-semibold",
          compact ? "text-xs tracking-[0.08em]" : "text-sm tracking-[0.12em]",
        )}
      >
        KAIZEN App
      </span>
    </span>
  );
}
