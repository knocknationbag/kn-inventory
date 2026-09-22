import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Icon from "@/components/ui/Icon";

export const metadata = { title: "Reports" };

const REPORTS = [
  { href: "/reports/sales", icon: "receipt", title: "Sales", text: "Sales by day, by product, and every bill, for any dates." },
  { href: "/reports/purchases", icon: "download", title: "Purchases", text: "What you bought, from whom, and what it cost." },
  { href: "/reports/inventory", icon: "package", title: "Inventory and stock value", text: "Every product: stock in hand, value at cost, and how much was sold." },
  { href: "/reports/movement", icon: "undo", title: "Stock movement", text: "Every stock in and out with a running balance, by date or by product." },
  { href: "/reports/low-stock", icon: "alert", title: "Low stock", text: "Products at or below your alert level, ready to reorder." },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Pick a report. Each one can be filtered and downloaded as CSV." />
      <ul className="grid gap-3 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="flex min-h-24 items-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-line-strong active:bg-subtle">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-text">
                <Icon name={r.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">{r.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{r.text}</span>
              </span>
              <Icon name="chevronRight" size={18} className="mt-1 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
