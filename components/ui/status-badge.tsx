import { cn } from "@/lib/utils";

export type StatusVariant = "pending" | "today" | "overdue" | "paid";

const variantClasses: Record<StatusVariant, string> = {
  pending: "bg-secondary text-secondary-foreground",
  today: "bg-warning-soft text-warning-text",
  overdue: "bg-danger-soft text-danger-text",
  paid: "bg-accent text-accent-foreground",
};

export function StatusBadge({
  variant,
  children,
  className,
}: {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
