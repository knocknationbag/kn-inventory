import PageHeader from "@/components/layout/PageHeader";
import SettingsBack from "@/components/settings/SettingsBack";
import ImportWizard from "@/components/settings/ImportWizard";
import CodeBlock from "@/components/ui/CodeBlock";

export const metadata = { title: "Import legacy data" };

const INVENTORY_SNIPPET = `On the old inventory app, open the "Backup" tab and tap "Export Backup File" — it downloads a .json file. Use that file below.`;

const BILLS_SNIPPET = `(function(){
  var data = {
    bills: JSON.parse(localStorage.getItem('kn_bills') || '[]'),
    lastBillNo: localStorage.getItem('kn_last_bill') || '0'
  };
  var blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kn_bills_backup.json';
  a.click();
})();`;

export default function ImportSettingsPage() {
  return (
    <>
      <SettingsBack />
      <PageHeader title="Import legacy data" description="Bring products, stock history and bills from the old system into Supabase." />

      <div className="mb-6 max-w-2xl space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <h2 className="mb-2 text-base font-semibold">Step 1 — Get your inventory backup</h2>
          <p className="text-sm text-muted">{INVENTORY_SNIPPET}</p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <h2 className="mb-2 text-base font-semibold">Step 2 — Get your bills backup</h2>
          <p className="mb-3 text-sm text-muted">
            The old billing app has no export button. On the device where the bills were made: open the old billing app, open the browser&rsquo;s developer console (usually F12 or long-press
            → Inspect), paste this in, and press Enter. It downloads a file.
          </p>
          <CodeBlock code={BILLS_SNIPPET} />
        </section>

        <p className="text-sm text-muted">
          Used the app on more than one device? Repeat these steps on each one and import every file — already-imported records are detected automatically, so it&rsquo;s safe to import the
          same file twice or import files from several devices one after another.
        </p>
      </div>

      <ImportWizard />
    </>
  );
}
