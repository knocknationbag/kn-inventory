import { redirect } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import FlashNotice from "@/components/ui/FlashNotice";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isOwner } = await supabase.rpc("is_owner");
  if (!isOwner) redirect("/login");

  return (
    <AppShell>
      <Suspense fallback={null}>
        <FlashNotice />
      </Suspense>
      {children}
    </AppShell>
  );
}
