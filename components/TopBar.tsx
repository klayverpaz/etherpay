import Link from "next/link";
import { signOut } from "@/app/(app)/actions/sign-out";
import { Button } from "@/components/ui/button";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-6">
        <span className="font-semibold">DojoPay</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/hoje" className="text-foreground hover:underline">
            Hoje
          </Link>
          <Link href="/clientes" className="text-foreground hover:underline">
            Clientes
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
        <form action={signOut}>
          <Button variant="ghost" type="submit" size="sm">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
