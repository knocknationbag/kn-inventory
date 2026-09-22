import PageHeader from "@/components/layout/PageHeader";
import PasswordForm from "@/components/settings/PasswordForm";
import SettingsBack from "@/components/settings/SettingsBack";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Change password" };

export default async function PasswordSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <SettingsBack />
      <PageHeader title="Change password" description={user?.email ? `Signed in as ${user.email}.` : undefined} />
      <PasswordForm />
    </>
  );
}
