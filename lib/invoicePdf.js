import { amountInWords } from "@/lib/numberToWords";

const NAVY = [17, 24, 39];
const GOLD = [212, 175, 55];
const GRAY = [100, 116, 139];
const LEFT = 14;
const RIGHT = 196;

// The standard PDF fonts have no rupee sign, so amounts use "Rs." here.
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

async function toDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Builds the A4 invoice as a PDF Blob. jsPDF is loaded on demand so it never weighs down normal pages.
export async function buildInvoicePdf({ sale, items, settings }) {
  const [{ jsPDF }, logo, stamp] = await Promise.all([import("jspdf"), toDataUrl("/invoice/logo.png"), toDataUrl("/invoice/stamp.png")]);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const hasDates = items.some((i) => i.line_date);

  // ---- letterhead
  let y = 17;
  if (logo) doc.addImage(logo, "PNG", LEFT, 9, 22, 22);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(String(settings.shop_name || "").toUpperCase(), 105, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  if (settings.phones) {
    doc.text(settings.phones, 105, y, { align: "center" });
    y += 5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  const address = doc.splitTextToSize(settings.address || "", 128);
  doc.text(address, 105, y, { align: "center" });
  y += address.length * 3.8;
  if (settings.gst_number) {
    doc.setTextColor(...NAVY);
    doc.text(`GSTIN: ${settings.gst_number}`, 105, y + 1, { align: "center" });
    y += 4.5;
  }
  y = Math.max(y, 34) + 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(LEFT, y, RIGHT, y);
  y += 8;

  // ---- bill header
  doc.setTextColor(...NAVY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Billed to", LEFT, y);
  doc.text("Bill no", RIGHT - 38, y);
  y += 5;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(sale.customer_name || "Walk-in customer", LEFT, y);
  doc.setFontSize(10);
  doc.text(String(sale.invoice_no), RIGHT - 38, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Date", RIGHT - 38, y);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(dmy(sale.sale_date), RIGHT - 38 + 10, y);
  y += 9;

  // ---- items table
  const col = hasDates ? { date: LEFT + 9, desc: LEFT + 32, qty: 138, rate: 165 } : { desc: LEFT + 11, qty: 145, rate: 168 };
  const descWidth = col.qty - col.desc - 12;

  const drawHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(LEFT, y, RIGHT - LEFT, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("#", LEFT + 2, y + 5.4);
    if (hasDates) doc.text("Date", col.date, y + 5.4);
    doc.text("Item", col.desc, y + 5.4);
    doc.text("Qty", col.qty, y + 5.4, { align: "right" });
    doc.text("Rate", col.rate, y + 5.4, { align: "right" });
    doc.text("Amount", RIGHT - 2, y + 5.4, { align: "right" });
    y += 8;
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
  };

  drawHeader();
  items.forEach((item, index) => {
    const wrapped = doc.splitTextToSize(item.description, descWidth);
    const rowHeight = Math.max(8, wrapped.length * 4.4 + 3.6);
    if (y + rowHeight > 272) {
      doc.addPage();
      y = 15;
      drawHeader();
    }
    doc.setTextColor(...GRAY);
    doc.text(String(index + 1), LEFT + 2, y + 5.4);
    doc.setTextColor(...NAVY);
    if (hasDates && item.line_date) doc.text(dmy(item.line_date), col.date, y + 5.4);
    doc.text(wrapped, col.desc, y + 5.4);
    doc.text(String(item.quantity), col.qty, y + 5.4, { align: "right" });
    doc.text(rs(item.rate), col.rate, y + 5.4, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(rs(item.line_total), RIGHT - 2, y + 5.4, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += rowHeight;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(LEFT, y, RIGHT, y);
  });

  // ---- totals
  const discount = Number(sale.discount_amount);
  const gst = Number(sale.gst_amount);
  const previous = Number(sale.previous_due);
  const change = Number(sale.change_amount);
  const rows = [["Subtotal", rs(sale.subtotal)]];
  if (discount > 0) rows.push([`Discount (${Number(sale.discount_rate)}%)`, `- ${rs(discount)}`]);
  if (gst > 0) rows.push([`GST (${Number(sale.gst_rate)}%)`, rs(gst)]);
  rows.push(["Grand total", rs(sale.grand_total), "strong"]);
  if (previous > 0) rows.push(["Previous due", rs(previous)], ["Total payable", rs(sale.total_payable)]);
  rows.push(["Paid", rs(sale.amount_paid)], ["Balance due", rs(sale.balance_due), "strong"]);
  if (change > 0) rows.push(["Change", rs(change)]);

  const blockHeight = rows.length * 6.4 + 40;
  if (y + blockHeight > 285) {
    doc.addPage();
    y = 18;
  }
  y += 7;
  for (const [label, value, style] of rows) {
    if (style === "strong") {
      doc.setFillColor(251, 245, 224);
      doc.rect(112, y - 4.6, RIGHT - 112, 6.6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    }
    doc.setTextColor(...NAVY);
    doc.text(label, 114, y);
    doc.text(value, RIGHT - 2, y, { align: "right" });
    y += 6.4;
  }

  // ---- words, notes, signature
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const words = doc.splitTextToSize(`Amount in words: ${amountInWords(sale.grand_total)}`, RIGHT - LEFT - 6);
  doc.setDrawColor(203, 213, 225);
  doc.rect(LEFT, y - 4.5, RIGHT - LEFT, words.length * 4.2 + 4);
  doc.text(words, LEFT + 3, y);
  y += words.length * 4.2 + 4;

  if (sale.notes) {
    const notes = doc.splitTextToSize(`Notes: ${sale.notes}`, RIGHT - LEFT);
    doc.setTextColor(...GRAY);
    doc.text(notes, LEFT, y + 2);
    y += notes.length * 4.2 + 4;
  }

  y += 10;
  if (y > 262) {
    doc.addPage();
    y = 30;
  }
  doc.setTextColor(...GRAY);
  doc.setFontSize(9.5);
  doc.text("Thank you for your purchase!", LEFT, y + 14);
  if (stamp) doc.addImage(stamp, "PNG", RIGHT - 34, y - 6, 26, 26);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Authorized Signature", RIGHT - 21, y + 24, { align: "center" });

  return doc.output("blob");
}
