"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Logo from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/Button";
import { NAV_ITEMS, isActive } from "@/lib/nav";

export default function Sidebar({ footer }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex lg:w-64 lg:px-4">
      <Link href="/" className="mb-6 flex h-10 items-center justify-center lg:justify-start lg:px-2" aria-label="Dashboard">
        <span className="hidden lg:block">
          <Logo className="h-8 w-auto" />
        </span>
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-on-primary lg:hidden">KN</span>
      </Link>

      <Link href="/sales/new" className={buttonClass({ variant: "gold", className: "mb-5 w-full !px-0 lg:!px-5" })} aria-label="New bill">
        <Icon name="plus" size={20} />
        <span className="hidden lg:inline">New Bill</span>
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 text-[15px] font-medium transition lg:justify-start ${
                active ? "bg-subtle text-ink" : "text-muted hover:bg-subtle hover:text-ink"
              }`}
            >
              <Icon name={item.icon} size={21} className={active ? "text-gold-text" : ""} />
              <span className="hidden lg:inline">{item.label}</span>
              {active && <span className="ml-auto hidden h-5 w-1 rounded-full bg-gold lg:block" />}
            </Link>
          );
        })}
      </nav>

      {footer}
    </aside>
  );
}
