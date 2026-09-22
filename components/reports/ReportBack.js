import Link from "next/link";

export default function ReportBack() {
  return (
    <Link href="/reports" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink print:hidden">
      ← All reports
    </Link>
  );
}
