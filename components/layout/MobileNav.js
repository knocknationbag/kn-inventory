"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { isActive } from "@/lib/nav";

const LEFT = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/products", label: "Products", icon: "package" },
];
const RIGHT = [
  { href: "/purchases", label: "Purchases", icon: "download" },
  { href: "/more", label: "More", icon: "more" },
];

function Tab({ item, pathname }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
        active ? "text-ink" : "text-muted"
      }`}
    >
      <Icon name={item.icon} size={23} className={active ? "text-gold-text" : ""} strokeWidth={active ? 2.1 : 1.75} />
      {item.label}
    </Link>
  );
}

export default function MobileNav() {
  const pathname = usePathname();
  const billActive = pathname.startsWith("/sales/new");

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-2">
        {LEFT.map((i) => (
          <Tab key={i.href} item={i} pathname={pathname} />
        ))}
        <Link
          href="/sales/new"
          aria-label="New bill"
          aria-current={billActive ? "page" : undefined}
          className="relative -mt-6 flex flex-col items-center justify-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full border-4 border-canvas bg-gold text-on-gold shadow-lg">
            <Icon name="plus" size={26} strokeWidth={2.4} />
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-muted">New Bill</span>
        </Link>
        {RIGHT.map((i) => (
          <Tab key={i.href} item={i} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
