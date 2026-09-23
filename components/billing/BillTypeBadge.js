import Badge from "@/components/ui/Badge";

export default function BillTypeBadge({ type }) {
  return type === "gst" ? <Badge tone="gold">GST invoice</Badge> : <Badge>Normal</Badge>;
}
