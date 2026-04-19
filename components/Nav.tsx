"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, PieChart, Settings2 } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const ITEMS: Item[] = [
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
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-background lg:hidden">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 px-2 py-2 text-xs ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <item.Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r bg-background p-3 lg:flex">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
