import { signOut } from "@/app/(app)/actions/sign-out";
import { Button } from "@/components/ui/button";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <span className="font-semibold">DojoPay</span>
      <div className="hidden items-center gap-3 lg:flex">
        <span className="text-sm text-muted-foreground">{email}</span>
        <form action={signOut}>
          <Button variant="ghost" type="submit" size="sm">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
