import { cn } from "@/lib/utils";

type Metric = {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "success";
};

export function HeroSummary({
  label,
  value,
  sub,
  secondary,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  secondary?: [Metric, Metric];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-[hsl(152_76%_96%)] p-5 md:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
      />
      <div className="relative z-10">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-[28px] font-bold leading-none tracking-tight tabular-nums md:text-4xl">
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}

        {secondary && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-3">
            {secondary.map((m, i) => (
              <div key={i}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-base font-bold tabular-nums",
                    m.tone === "danger" && "text-danger-text",
                    m.tone === "success" && "text-accent-foreground",
                  )}
                >
                  {m.value}
                </div>
                {m.sub && <div className="text-[11px] text-muted-foreground">{m.sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
