import { redirect } from "next/navigation";
import LoginForm from "@/app/(auth)/login/LoginForm";
import Logo from "@/components/ui/Logo";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: isOwner } = await supabase.rpc("is_owner");
    if (isOwner) redirect("/");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))]">
        <ThemeSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="h-10 w-auto" />
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-gold-text">Owner login</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage inventory and billing.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
