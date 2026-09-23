import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Icon from "@/components/ui/Icon";

export const metadata = { title: "New bill" };

const CHOICES = [
  {
    href: "/sales/new",
    icon: "receipt",
    title: "Normal bill",
    body: "Quick bill for everyday sales. Optional GST %, discount and previous due.",
  },
  {
    href: "/sales/gst/new",
    icon: "file",
    title: "GST Tax Invoice",
    body: "Full tax invoice with HSN codes, CGST + SGST or IGST, and buyer GSTIN.",
  },
];

export default function NewBillChoicePage() {
  return (
    <>
      <PageHeader title="New bill" description="Which kind of bill do you want to make? Both use the same products and stock." />
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {CHOICES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex min-h-36 flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:border-line-strong active:bg-subtle"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-gold-soft text-gold-text">
              <Icon name={c.icon} size={24} />
            </span>
            <span className="text-lg font-semibold">{c.title}</span>
            <span className="text-sm text-muted">{c.body}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
