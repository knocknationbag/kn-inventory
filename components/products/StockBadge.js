import Badge from "@/components/ui/Badge";

export default function StockBadge({ stock, isLow }) {
  if (stock <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (isLow) return <Badge tone="warn">Low stock</Badge>;
  return <Badge tone="success">In stock</Badge>;
}
