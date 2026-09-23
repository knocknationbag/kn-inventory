"use client";

import { useRef, useState } from "react";
import Button, { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { billText } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format";
import { gstInvoiceText } from "@/lib/gst";

const fileName = (doc, fallback) => `${doc.invoice_no}-${(doc.customer_name || fallback).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}.pdf`;

// Serves both Normal bills (`sale`) and GST Tax Invoices (`invoice`).
export default function InvoiceActions({ sale, invoice, items, settings }) {
  const gst = Boolean(invoice);
  const doc = invoice ?? sale;
  const noun = gst ? "Invoice" : "Bill";
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const dialogRef = useRef(null);
  const text = () => (gst ? gstInvoiceText({ invoice, items, settings, money: formatCurrency, date: formatDate }) : billText({ sale, items, settings, money: formatCurrency, date: formatDate }));

  const makePdf = async () => {
    if (gst) {
      const { buildGstInvoicePdf } = await import("@/lib/gstInvoicePdf");
      return buildGstInvoicePdf({ invoice, items, settings });
    }
    const { buildInvoicePdf } = await import("@/lib/invoicePdf");
    return buildInvoicePdf({ sale, items, settings });
  };

  const download = async () => {
    setBusy("pdf");
    try {
      const blob = await makePdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(doc, gst ? "invoice" : "bill");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("PDF saved.");
    } catch {
      toast.error("The PDF could not be created. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      const blob = await makePdf();
      const file = new File([blob], fileName(doc, gst ? "invoice" : "bill"), { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${noun} ${doc.invoice_no}`, text: `${noun} ${doc.invoice_no} from ${settings.shop_name}` });
        return;
      }
      dialogRef.current?.showModal();
    } catch (error) {
      if (error?.name !== "AbortError") dialogRef.current?.showModal();
    } finally {
      setBusy("");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      toast.success(`${noun} copied.`);
    } catch {
      toast.error("Could not copy. Long-press the text to copy it instead.");
    }
    dialogRef.current?.close();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="primary" onClick={() => window.print()}>
          <Icon name="printer" size={18} />
          Print
        </Button>
        <Button variant="outline" onClick={download} disabled={busy === "pdf"}>
          <Icon name="download" size={18} />
          {busy === "pdf" ? "Preparing..." : "Save PDF"}
        </Button>
        <Button variant="gold" onClick={share} disabled={busy === "share"}>
          <Icon name="share" size={18} />
          {busy === "share" ? "Preparing..." : "Share"}
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50 max-md:mb-4 print:hidden"
      >
        <div className="p-5">
          <h2 className="text-lg font-semibold">Share {noun.toLowerCase()} {doc.invoice_no}</h2>
          <p className="mt-1 text-sm text-muted">Your browser can&rsquo;t share the PDF directly, so pick an option.</p>
          <div className="mt-4 grid gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text())}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dialogRef.current?.close()}
              className={buttonClass({ variant: "gold" })}
            >
              Send on WhatsApp
            </a>
            <button type="button" onClick={copy} className={buttonClass({ variant: "outline" })}>
              Copy text
            </button>
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                download();
              }}
              className={buttonClass({ variant: "outline" })}
            >
              Download PDF
            </button>
            <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClass({ variant: "ghost" })}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
