import PageHeader from "@/components/layout/PageHeader";
import ShopForm from "@/components/settings/ShopForm";
import SettingsBack from "@/components/settings/SettingsBack";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Shop details" };

export default async function ShopSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("settings").select("*").maybeSingle();

  return (
    <>
      <SettingsBack />
      <PageHeader title="Shop details" description="Shown on invoices and used for billing defaults." />
      <ShopForm settings={settings} />
    </>
  );
}
