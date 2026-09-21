import Icon from "@/components/ui/Icon";
import { signOut } from "@/lib/actions/auth";

export default function SignOutButton({ variant = "row" }) {
  if (variant === "sidebar") {
    return (
      <form action={signOut}>
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-subtle hover:text-ink lg:justify-start"
        >
          <Icon name="logout" size={20} />
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </form>
    );
  }

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left font-medium text-danger"
      >
        <Icon name="logout" />
        Sign out
      </button>
    </form>
  );
}
