import { GST_DECLARATION, hasBankDetails } from "@/lib/gst";
import { amountInWords } from "@/lib/numberToWords";

const NAVY = [17, 24, 39];
const GOLD = [212, 175, 55];
const GRAY = [100, 116, 139];
const LINE = [163, 163, 163];
const LEFT = 12;
const RIGHT = 198;

// The standard PDF fonts have no rupee sign, so amounts use "Rs." here.
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("-") : "");

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

const text = (doc, value, x, y, opts) => doc.text(String(value ?? ""), x, y, opts);
const TAGLINE = "Mfg. School Bag, College Bags & Complimentary Items";
// Both files are 1600x1000px; keep that exact aspect ratio so they never look stretched.
const LOGO_W = 22;
const LOGO_H = 13.75;

async function loadPdfTools() {
  const [{ jsPDF }, stamp, logoLeft, logoRight] = await Promise.all([
    import("jspdf"),
    toDataUrl("/invoice/stamp.png"),
    toDataUrl("/invoice/gst-bill-logo-left.jpeg"),
    toDataUrl("/invoice/gst-bill-logo-right.jpeg"),
  ]);
  return { jsPDF, stamp, logoLeft, logoRight };
}

// Draws one GST Tax Invoice onto the current page of `doc` (adding pages as it needs them).
function drawGstInvoice(doc, { invoice, items, settings, logoLeft, logoRight, stamp }) {
  const inter = invoice.tax_type === "inter";
  const draft = invoice.status === "draft";
  const text = (value, x, y, opts) => doc.text(String(value ?? ""), x, y, opts);

  // ---- letterhead
  let y = 15;
  if (logoLeft) doc.addImage(logoLeft, "JPEG", LEFT, 8, LOGO_W, LOGO_H);
  if (logoRight) doc.addImage(logoRight, "JPEG", RIGHT - LOGO_W, 8, LOGO_W, LOGO_H);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  text(String(settings.shop_name || "").toUpperCase(), 105, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  text(TAGLINE.toUpperCase(), 105, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const address = doc.splitTextToSize(settings.address || "", 128);
  doc.text(address, 105, y, { align: "center" });
  y += address.length * 3.5;
  doc.setTextColor(...NAVY);
  const contact = [settings.email && `Email: ${settings.email}`, settings.phones && `Mob.: ${settings.phones}`].filter(Boolean).join("   |   ");
  if (contact) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    text(contact, 105, y + 0.5, { align: "center" });
    y += 4;
  }
  const ids = [settings.pan && `PAN No: ${settings.pan}`, settings.gst_number && `GSTIN: ${settings.gst_number}`].filter(Boolean).join("   |   ");
  if (ids) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    text(ids, 105, y + 0.5, { align: "center" });
    y += 4;
  }
  y = Math.max(y, 8 + LOGO_H + 2) + 1;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(LEFT, y, RIGHT, y);
  y += 7;

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  text(draft ? "DRAFT INVOICE" : "TAX INVOICE", 105, y, { align: "center", charSpace: 1.2 });
  y += 3;
  if (draft) {
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    text("Draft. Not a valid tax invoice until it is finalized.", 105, y + 3, { align: "center" });
    y += 4;
  }
  y += 4;

  // ---- receiver + invoice details
  const boxTop = y;
  const colGap = 3;
  const boxWidth = (RIGHT - LEFT - colGap) / 2;
  const rightX = LEFT + boxWidth + colGap;
  const kv = (x, yy, label, value, bold, width) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    text(label, x + 2, yy);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(String(value || ""), width);
    doc.text(lines, x + 28, yy);
    return Math.max(4.2, lines.length * 3.6 + 0.6);
  };
  const box = (x, title, rows) => {
    let yy = boxTop + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    text(title.toUpperCase(), x + 2, yy);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(x + 2, yy + 1.5, x + boxWidth - 2, yy + 1.5);
    yy += 5.5;
    for (const [label, value, bold] of rows) yy += kv(x, yy, label, value, bold, boxWidth - 32);
    return yy;
  };
  const leftEnd = box(LEFT, "Details of receiver / bill to", [
    ["Name", invoice.customer_name, true],
    ["Address", invoice.customer_address],
    ["GSTIN", invoice.customer_gstin || "Unregistered"],
    ["State", `${invoice.customer_state}   Code: ${invoice.customer_state_code}`],
    ["Mob. no.", invoice.customer_mobile],
  ]);
  const rightEnd = box(rightX, "Invoice details", [
    ["Invoice no.", invoice.invoice_no, true],
    ["Invoice date", dmy(invoice.invoice_date), true],
    ["Reverse charge", invoice.reverse_charge ? "Yes" : "No"],
    ["State", `${invoice.supply_state}   Code: ${invoice.supply_state_code}`],
    ["Transport mode", invoice.transport_mode],
    ["Vehicle no.", invoice.vehicle_number],
    ["Date of supply", dmy(invoice.date_of_supply)],
    ["Place of supply", `${invoice.place_of_supply || ""}${invoice.place_of_supply_state_code ? `   Code: ${invoice.place_of_supply_state_code}` : ""}`],
  ]);
  const boxBottom = Math.max(leftEnd, rightEnd) + 1;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(LEFT, boxTop, boxWidth, boxBottom - boxTop);
  doc.rect(rightX, boxTop, boxWidth, boxBottom - boxTop);
  y = boxBottom + 5;

  // ---- items table
  const cols = { sr: LEFT + 2, name: LEFT + 10, itemNo: 92, hsn: 114, uom: 132, qty: 154, rate: 174, amount: RIGHT - 1.5 };
  const nameWidth = cols.itemNo - cols.name - 2;

  const drawHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(LEFT, y, RIGHT - LEFT, 7.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    text("Sr.", cols.sr, y + 5);
    text("Name of products", cols.name, y + 5);
    text("Item no.", cols.itemNo, y + 5);
    text("HSN / ACS", cols.hsn, y + 5);
    text("UOM", cols.uom, y + 5);
    text("Qty", cols.qty, y + 5, { align: "right" });
    text("Rate", cols.rate, y + 5, { align: "right" });
    text("Amount", cols.amount, y + 5, { align: "right" });
    y += 7.5;
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
  };

  drawHeader();
  const rowLine = () => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(LEFT, y, RIGHT, y);
  };
  items.forEach((item, index) => {
    const wrapped = doc.splitTextToSize(item.product_name || "", nameWidth);
    const rowHeight = Math.max(7.5, wrapped.length * 4 + 3.5);
    if (y + rowHeight > 275) {
      doc.addPage();
      y = 14;
      drawHeader();
    }
    doc.setTextColor(...GRAY);
    text(index + 1, cols.sr, y + 5);
    doc.setTextColor(...NAVY);
    doc.text(wrapped, cols.name, y + 5);
    text(item.item_no, cols.itemNo, y + 5);
    text(item.hsn_code, cols.hsn, y + 5);
    text(item.uom, cols.uom, y + 5);
    text(item.quantity, cols.qty, y + 5, { align: "right" });
    text(rs(item.rate), cols.rate, y + 5, { align: "right" });
    doc.setFont("helvetica", "bold");
    text(rs(item.line_total), cols.amount, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += rowHeight;
    rowLine();
  });
  for (let i = items.length; i < 3; i += 1) {
    y += 7.5;
    rowLine();
  }

  // ---- tax summary (right-aligned block)
  const cgst = Number(invoice.cgst_amount);
  const sgst = Number(invoice.sgst_amount);
  const igst = Number(invoice.igst_amount);
  const paid = Number(invoice.amount_paid);
  const rows = [["Total amount before tax", rs(invoice.taxable_amount)]];
  if (inter) rows.push([`IGST @ ${Number(invoice.igst_rate)}%`, rs(igst)]);
  else rows.push([`CGST @ ${Number(invoice.cgst_rate)}%`, rs(cgst)], [`SGST @ ${Number(invoice.sgst_rate)}%`, rs(sgst)]);
  rows.push(["Total tax amount", rs(cgst + sgst + igst)], ["Total amount after tax", rs(invoice.grand_total), "strong"]);
  if (paid > 0) rows.push(["Amount paid", rs(paid)], ["Balance due", rs(invoice.balance_due), "strong"]);

  const wordsLines = doc.splitTextToSize(`Total invoice amount in words: ${amountInWords(invoice.grand_total)}`, RIGHT - LEFT - 6);
  const notesLines = invoice.notes ? doc.splitTextToSize(`Notes: ${invoice.notes}`, RIGHT - LEFT) : [];
  const declLines = doc.splitTextToSize(`Declaration: ${GST_DECLARATION}`, 100);
  const bankRows = hasBankDetails(settings) ? 5 : 0;
  const footerHeight = rows.length * 6 + 8 + wordsLines.length * 4 + 6 + notesLines.length * 4 + Math.max(declLines.length * 3.5 + bankRows * 3.8 + 6, 16) + 34;
  if (y + footerHeight > 290) {
    doc.addPage();
    y = 14;
  }

  y += 6;
  const blockX = 112;
  for (const [label, value, style] of rows) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    if (style === "strong") {
      doc.setFillColor(243, 244, 246);
      doc.rect(blockX, y - 4.2, RIGHT - blockX, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
    }
    doc.setTextColor(...NAVY);
    text(label, blockX + 2, y);
    text(value, RIGHT - 2, y, { align: "right" });
    doc.line(blockX, y + 1.8, RIGHT, y + 1.8);
    y += 6;
  }

  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setDrawColor(...LINE);
  doc.rect(LEFT, y - 4, RIGHT - LEFT, wordsLines.length * 4 + 3);
  doc.text(wordsLines, LEFT + 3, y);
  y += wordsLines.length * 4 + 3;

  if (notesLines.length) {
    doc.setTextColor(...GRAY);
    doc.text(notesLines, LEFT, y + 2);
    y += notesLines.length * 4 + 3;
  }

  // ---- bank details + declaration, certification
  y += 3;
  const footTop = y;
  const leftW = 108;
  let yy = y + 4.5;
  doc.setTextColor(...NAVY);
  if (bankRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    text("BANK DETAILS", LEFT + 2, yy);
    yy += 4;
    doc.setFont("helvetica", "normal");
    const bank = [["Bank Name", settings.bank_name], ["Bank Account Number", settings.bank_account], ["Bank IFSC Code", settings.bank_ifsc], ["Branch", settings.bank_branch]];
    for (const [label, value] of bank) {
      if (!value) continue;
      text(`${label}: ${value}`, LEFT + 2, yy);
      yy += 3.8;
    }
    yy += 1.5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(declLines, LEFT + 2, yy);
  yy += declLines.length * 3.3 + 2;
  const footHeight = Math.max(yy - footTop, 18);
  doc.setDrawColor(...LINE);
  doc.rect(LEFT, footTop, leftW, footHeight);
  doc.rect(LEFT + leftW, footTop, RIGHT - LEFT - leftW, footHeight);
  doc.setFontSize(8.5);
  const cert = doc.splitTextToSize("Certified that the particulars given above are true and correct.", RIGHT - LEFT - leftW - 6);
  doc.text(cert, LEFT + leftW + (RIGHT - LEFT - leftW) / 2, footTop + footHeight / 2 - (cert.length - 1) * 2, { align: "center" });
  y = footTop + footHeight + 4;

  // ---- signatures
  if (y + 30 > 290) {
    doc.addPage();
    y = 14;
  }
  const signW = (RIGHT - LEFT - 3) / 2;
  doc.rect(LEFT, y, signW, 28);
  doc.rect(LEFT + signW + 3, y, signW, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(["Receiver's signature", "with stamp"], LEFT + signW / 2, y + 22, { align: "center" });
  if (stamp) doc.addImage(stamp, "PNG", LEFT + signW + 3 + signW / 2 - 8, y + 1.5, 16, 16);
  text(`For ${settings.shop_name}`, LEFT + signW + 3 + signW / 2, y + 21, { align: "center" });
  text("Authorised signatory", LEFT + signW + 3 + signW / 2, y + 25, { align: "center" });
}

// Builds a single GST Tax Invoice as an A4 PDF Blob. jsPDF is loaded on demand so it never weighs down normal pages.
export async function buildGstInvoicePdf({ invoice, items, settings }) {
  const { jsPDF, logoLeft, logoRight, stamp } = await loadPdfTools();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  drawGstInvoice(doc, { invoice, items, settings, logoLeft, logoRight, stamp });
  return doc.output("blob");
}

// Monthly report for the CA: a summary table of every finalized invoice, then each invoice's full page.
export async function buildGstReportPdf({ invoices, settings, from, to }) {
  const { jsPDF, logoLeft, logoRight, stamp } = await loadPdfTools();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(String(settings.shop_name || "").toUpperCase(), 105, 16, { align: "center" });
  doc.setFontSize(11);
  doc.text("MONTHLY GST INVOICE REPORT", 105, 23, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Period: ${from ? dmy(from) : "start"} to ${to ? dmy(to) : "end"}   |   Finalized invoices: ${invoices.length}`, 105, 29, { align: "center" });

  const cols = { date: LEFT + 1, no: LEFT + 22, name: LEFT + 38, taxable: 128, cgst: 148, sgst: 167, igst: 184, total: RIGHT - 1 };
  let y = 36;
  const header = () => {
    doc.setFillColor(...NAVY);
    doc.rect(LEFT, y, RIGHT - LEFT, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    text(doc, "Date", cols.date, y + 4.7);
    text(doc, "Inv no.", cols.no, y + 4.7);
    text(doc, "Customer", cols.name, y + 4.7);
    for (const [label, x] of [["Taxable", cols.taxable], ["CGST", cols.cgst], ["SGST", cols.sgst], ["IGST", cols.igst], ["Total", cols.total]]) text(doc, label, x, y + 4.7, { align: "right" });
    y += 7;
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
  };
  const num = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  header();
  const sums = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  const p = (n) => Math.round((Number(n) || 0) * 100);
  for (const inv of invoices) {
    if (y > 280) {
      doc.addPage();
      y = 14;
      header();
    }
    text(doc, dmy(inv.invoice_date), cols.date, y + 4.6);
    text(doc, inv.invoice_no, cols.no, y + 4.6);
    text(doc, doc.splitTextToSize(inv.customer_name || "", 52)[0], cols.name, y + 4.6);
    text(doc, num(inv.taxable_amount), cols.taxable, y + 4.6, { align: "right" });
    text(doc, num(inv.cgst_amount), cols.cgst, y + 4.6, { align: "right" });
    text(doc, num(inv.sgst_amount), cols.sgst, y + 4.6, { align: "right" });
    text(doc, num(inv.igst_amount), cols.igst, y + 4.6, { align: "right" });
    text(doc, num(inv.grand_total), cols.total, y + 4.6, { align: "right" });
    y += 6.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(LEFT, y, RIGHT, y);
    sums.taxable += p(inv.taxable_amount);
    sums.cgst += p(inv.cgst_amount);
    sums.sgst += p(inv.sgst_amount);
    sums.igst += p(inv.igst_amount);
    sums.total += p(inv.grand_total);
  }
  if (y > 275) {
    doc.addPage();
    y = 14;
  }
  doc.setFillColor(243, 244, 246);
  doc.rect(LEFT, y + 1, RIGHT - LEFT, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  text(doc, "TOTAL", cols.name, y + 5.8);
  for (const [key, x] of [["taxable", cols.taxable], ["cgst", cols.cgst], ["sgst", cols.sgst], ["igst", cols.igst], ["total", cols.total]]) text(doc, num(sums[key] / 100), x, y + 5.8, { align: "right" });

  for (const inv of invoices) {
    doc.addPage();
    drawGstInvoice(doc, { invoice: inv, items: inv.items, settings, logoLeft, logoRight, stamp });
  }
  return doc.output("blob");
}
