import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, SideNav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const email = user.email ?? "";
  const name = email.split("@")[0] ?? "Professor";

  return (
    <div className="flex min-h-screen">
      <SideNav userLabel={{ name, plan: "Plano grátis" }} />
      <main className="flex-1 px-4 py-6 pb-28 lg:px-8 lg:py-8 lg:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
