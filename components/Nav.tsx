"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, PieChart, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const ITEMS: readonly Item[] = [
  { href: "/hoje", label: "Hoje", Icon: CalendarDays },
  { href: "/clientes", label: "Clientes", Icon: Users },
  { href: "/relatorios", label: "Relatórios", Icon: PieChart },
  { href: "/ajustes", label: "Ajustes", Icon: Settings2 },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/hoje") return pathname === "/hoje";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 flex items-stretch gap-1 rounded-2xl border border-border bg-card p-1.5",
        "shadow-[0_8px_24px_rgba(10,10,10,0.06)]",
        "lg:hidden",
      )}
      aria-label="Navegação inferior"
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav({ userLabel }: { userLabel?: { name: string; plan: string } }) {
  const pathname = usePathname();
  return (
    <nav
      className="hidden w-56 shrink-0 flex-col border-r border-border bg-card p-3 lg:flex"
      aria-label="Navegação lateral"
    >
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-foreground">
          DP
        </div>
        <span className="text-sm font-bold tracking-tight">DojoPay</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {userLabel && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {userLabel.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{userLabel.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{userLabel.plan}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
