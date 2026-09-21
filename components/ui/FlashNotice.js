"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

const NOTICES = {
  product_created: "Product added.",
  product_updated: "Product saved.",
  product_archived: "Product archived. It is hidden from lists but its history is kept.",
  product_restored: "Product restored.",
  product_deleted: "Product deleted.",
  purchase_saved: "Purchase saved. Stock updated.",
  purchase_deleted: "Purchase deleted. Stock updated.",
  bill_saved: "Bill saved. Stock updated.",
  bill_deleted: "Bill deleted. Stock updated.",
  return_saved: "Return saved.",
  return_deleted: "Return deleted.",
  list_saved: "Saved.",
  list_deleted: "Deleted.",
};

// Shows a one-time toast for `?notice=key` after a redirect, then cleans the URL.
export default function FlashNotice() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");

  useEffect(() => {
    if (!notice) return;
    if (NOTICES[notice]) toast.success(NOTICES[notice]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("notice");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [notice, pathname, router, searchParams, toast]);

  return null;
}
