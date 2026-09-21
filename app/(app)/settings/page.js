import PageHeader from "@/components/layout/PageHeader";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import FullscreenButton from "@/components/ui/FullscreenButton";
import { EmptyState } from "@/components/ui/States";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Appearance, shop details, security and backups." />
      <div className="max-w-xl space-y-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Appearance</h2>
          <ThemeSwitcher variant="segmented" />
          <div className="mt-3">
            <FullscreenButton variant="row" />
          </div>
        </section>
        <EmptyState icon="sliders" title="More settings coming soon" description="Shop details, change password, backup and legacy import are built in Phase G." />
      </div>
    </>
  );
}
