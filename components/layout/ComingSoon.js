import PageHeader from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";

export default function ComingSoon({ title, description, phase, icon }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title="Coming soon" description={`This section is built in ${phase}.`} />
    </>
  );
}
