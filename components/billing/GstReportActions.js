"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

const query = (from, to) => new URLSearchParams({ from, to }).toString();

// Excel / PDF downloads for the monthly GST report. The PDF is built in the browser from the finalized invoices.
export default function GstReportActions({ from, to, settings, count }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const disabled = count === 0;
  const label = from && to && from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : `${from || "start"}_to_${to || "end"}`;
  const fileName = `GST_Report_${label}.pdf`;

  const makePdf = async () => {
    const res = await fetch(`/sales/gst/export/data?${query(from, to)}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Could not load the invoices.");
    const { buildGstReportPdf } = await import("@/lib/gstInvoicePdf");
    return buildGstReportPdf({ invoices: body.invoices, settings, from, to });
  };

  const run = async (kind) => {
    setBusy(kind);
    try {
      const blob = await makePdf();
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (kind === "share" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Monthly GST report", text: `GST invoices ${label}` });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("PDF saved.");
    } catch (error) {
      if (error?.name !== "AbortError") toast.error(error?.message || "The PDF could not be created. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {disabled ? (
        <span className={buttonClass({ variant: "primary", className: "pointer-events-none opacity-50" })} aria-disabled="true">
          <Icon name="download" size={18} />
          Excel (.xlsx)
        </span>
      ) : (
        <a href={`/sales/gst/export/xlsx?${query(from, to)}`} download className={buttonClass({ variant: "primary" })}>
          <Icon name="download" size={18} />
          Excel (.xlsx)
        </a>
      )}
      <button type="button" onClick={() => run("pdf")} disabled={disabled || Boolean(busy)} className={buttonClass({ variant: "outline" })}>
        <Icon name="file" size={18} />
        {busy === "pdf" ? "Preparing..." : "Monthly PDF"}
      </button>
      <button type="button" onClick={() => run("share")} disabled={disabled || Boolean(busy)} className={buttonClass({ variant: "gold" })}>
        <Icon name="share" size={18} />
        {busy === "share" ? "Preparing..." : "Share PDF"}
      </button>
    </div>
  );
}
