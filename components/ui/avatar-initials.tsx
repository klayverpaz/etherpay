import { cn } from "@/lib/utils";
import { initials } from "@/lib/initials";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function AvatarInitials({
  name,
  size = "md",
  variant = "soft",
  className,
}: {
  name: string;
  size?: Size;
  variant?: "soft" | "solid";
  className?: string;
}) {
  const variantClasses =
    variant === "solid"
      ? "bg-primary text-primary-foreground"
      : "bg-accent text-accent-foreground";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeClasses[size],
        variantClasses,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
