import StatusBadge from "@/components/billing/StatusBadge";
import Badge from "@/components/ui/Badge";

export default function BillStatusBadge({ bill }) {
  if (bill.status === "draft") return <Badge tone="warn">Draft</Badge>;
  return <StatusBadge sale={bill} />;
}
