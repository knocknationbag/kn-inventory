import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SignOutButton from "@/components/layout/SignOutButton";
import FullscreenButton from "@/components/ui/FullscreenButton";
import Icon from "@/components/ui/Icon";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { MORE_ITEMS } from "@/lib/nav";

export const metadata = { title: "More" };

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <div className="space-y-6">
        <nav aria-label="More" className="space-y-2">
          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 font-medium text-ink"
            >
              <Icon name={item.icon} className="text-gold-text" />
              {item.label}
              <Icon name="chevronRight" size={18} className="ml-auto text-muted" />
            </Link>
          ))}
        </nav>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Appearance</h2>
          <ThemeSwitcher variant="segmented" />
          <div className="mt-3">
            <FullscreenButton variant="row" />
          </div>
        </section>

        <SignOutButton />
      </div>
    </>
  );
}
