import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import FullscreenButton from "@/components/ui/FullscreenButton";
import Icon from "@/components/ui/Icon";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

export const metadata = { title: "Settings" };

const LINKS = [
  { href: "/settings/shop", icon: "sliders", title: "Shop details", text: "Name, address, GST number and invoice numbering." },
  { href: "/settings/password", icon: "lock", title: "Change password", text: "Update your sign-in password." },
  { href: "/settings/backup", icon: "download", title: "Backup & export", text: "Download a full copy of your data." },
  { href: "/settings/import", icon: "undo", title: "Import legacy data", text: "Bring in data from the old system." },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Shop details, security, appearance and data." />

      <div className="max-w-xl space-y-6">
        <ul className="space-y-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-16 items-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-line-strong active:bg-subtle">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-text">
                  <Icon name={l.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{l.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{l.text}</span>
                </span>
                <Icon name="chevronRight" size={18} className="mt-2 text-muted" />
              </Link>
            </li>
          ))}
        </ul>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Appearance</h2>
          <ThemeSwitcher variant="segmented" />
          <div className="mt-3">
            <FullscreenButton variant="row" />
          </div>
        </section>
      </div>
    </>
  );
}
