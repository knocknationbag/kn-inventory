import Badge from "@/components/ui/Badge";
import { paymentStatus } from "@/lib/billing";

export default function StatusBadge({ sale }) {
  const status = paymentStatus(sale);
  if (status === "paid") return <Badge tone="success">Paid</Badge>;
  if (status === "partial") return <Badge tone="warn">Part paid</Badge>;
  return <Badge tone="danger">Unpaid</Badge>;
}
