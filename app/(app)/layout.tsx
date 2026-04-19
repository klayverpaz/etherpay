import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { BottomNav, SideNav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar email={user.email ?? ""} />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 px-4 py-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
