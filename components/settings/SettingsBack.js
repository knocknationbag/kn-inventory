import Link from "next/link";

export default function SettingsBack() {
  return (
    <Link href="/settings" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
      ← Settings
    </Link>
  );
}
