import PageHeader from "@/components/layout/PageHeader";
import SettingsBack from "@/components/settings/SettingsBack";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

export const metadata = { title: "Backup & export" };

export default function BackupSettingsPage() {
  return (
    <>
      <SettingsBack />
      <PageHeader title="Backup & export" description="Supabase is the permanent home for your data. These downloads are extra copies you control." />

      <div className="max-w-xl space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="text-base font-semibold">Full data backup (JSON)</h2>
          <p className="mt-1 text-sm text-muted">
            Every product, purchase, bill, return, customer and supplier, plus your shop settings — everything stored in Supabase, in one file. It does
            not include your password or anything from the app itself.
          </p>
          <a href="/settings/backup/export" download className="mt-4 inline-block">
            <Button variant="gold">
              <Icon name="download" size={18} />
              Download full backup
            </Button>
          </a>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="text-base font-semibold">Report exports (CSV)</h2>
          <p className="mt-1 text-sm text-muted">Each report page has its own CSV and JSON download, filtered to whatever dates you&rsquo;ve chosen there — handy for opening in Excel or Sheets.</p>
          <Button href="/reports" variant="outline" className="mt-4">
            Go to reports
          </Button>
        </section>
      </div>
    </>
  );
}
