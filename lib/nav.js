export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/products", label: "Products", icon: "package" },
  { href: "/purchases", label: "Purchases", icon: "download" },
  { href: "/sales", label: "Bills", icon: "receipt" },
  { href: "/returns", label: "Returns", icon: "undo" },
  { href: "/reports", label: "Reports", icon: "chart" },
  { href: "/settings", label: "Settings", icon: "sliders" },
];

export const MORE_ITEMS = NAV_ITEMS.filter((i) => ["/sales", "/returns", "/reports", "/settings"].includes(i.href));

export function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
