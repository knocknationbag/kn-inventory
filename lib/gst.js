// GST Tax Invoice maths. Same rules as save_gst_invoice() in the database: tax is worked out once on the
// invoice's taxable total (not per line), each amount rounded to the paisa, in whole paise so browser and
// database agree exactly. Intra-state charges CGST + SGST; inter-state charges IGST only, never both.

const paise = (n) => Math.round((Number(n) || 0) * 100);
const basisPoints = (percent) => Math.round((Number(percent) || 0) * 100);
const divRound = (numerator, denominator) => Math.floor((numerator * 2 + denominator) / (denominator * 2));
const rupees = (p) => p / 100;

export function computeGstTotals({ lines, taxType, cgstRate = 0, sgstRate = 0, igstRate = 0, paid = 0 }) {
  const taxable = lines.reduce((sum, l) => sum + (Math.trunc(Number(l.quantity)) || 0) * paise(l.rate), 0);
  const inter = taxType === "inter";
  const cgst = inter ? 0 : divRound(taxable * basisPoints(cgstRate), 10000);
  const sgst = inter ? 0 : divRound(taxable * basisPoints(sgstRate), 10000);
  const igst = inter ? divRound(taxable * basisPoints(igstRate), 10000) : 0;
  const grand = taxable + cgst + sgst + igst;
  const paidAmount = paise(paid);
  return {
    taxable: rupees(taxable),
    cgst: rupees(cgst),
    sgst: rupees(sgst),
    igst: rupees(igst),
    grand: rupees(grand),
    paid: rupees(paidAmount),
    balance: rupees(Math.max(grand - paidAmount, 0)),
  };
}

// The first two digits of a GSTIN are the state code of the registration.
export const gstinStateCode = (gstin) => (/^\d{2}/.test(gstin ?? "") ? gstin.slice(0, 2) : "");

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

export const INDIAN_STATES = [
  ["Jammu and Kashmir", "01"], ["Himachal Pradesh", "02"], ["Punjab", "03"], ["Chandigarh", "04"], ["Uttarakhand", "05"],
  ["Haryana", "06"], ["Delhi", "07"], ["Rajasthan", "08"], ["Uttar Pradesh", "09"], ["Bihar", "10"], ["Sikkim", "11"],
  ["Arunachal Pradesh", "12"], ["Nagaland", "13"], ["Manipur", "14"], ["Mizoram", "15"], ["Tripura", "16"],
  ["Meghalaya", "17"], ["Assam", "18"], ["West Bengal", "19"], ["Jharkhand", "20"], ["Odisha", "21"],
  ["Chhattisgarh", "22"], ["Madhya Pradesh", "23"], ["Gujarat", "24"], ["Dadra and Nagar Haveli and Daman and Diu", "26"],
  ["Maharashtra", "27"], ["Karnataka", "29"], ["Goa", "30"], ["Lakshadweep", "31"], ["Kerala", "32"],
  ["Tamil Nadu", "33"], ["Puducherry", "34"], ["Andaman and Nicobar Islands", "35"], ["Telangana", "36"],
  ["Andhra Pradesh", "37"], ["Ladakh", "38"],
].map(([name, code]) => ({ name, code }));

export const stateByName = (name) => INDIAN_STATES.find((s) => s.name === name);
export const stateByCode = (code) => INDIAN_STATES.find((s) => s.code === code);

export const GST_DECLARATION =
  'I/We hereby certify that my/our registration certificate under the GST Act 2017 is in force on the date on which the sale of the goods specified in this "Tax Invoice" is made by me/us and that the transaction of sale covered by this "Tax Invoice" has been effected by me/us in the regular course of my/our business, subject to Mumbai Jurisdiction.';

export const hasBankDetails = (s) => Boolean(s.bank_name || s.bank_account || s.bank_ifsc || s.bank_branch);

// Plain-text version of a GST invoice, used for "Copy" and the WhatsApp message.
export function gstInvoiceText({ invoice, items, settings, money, date }) {
  const inter = invoice.tax_type === "inter";
  const lines = [
    settings.shop_name,
    settings.gst_number ? `GSTIN: ${settings.gst_number}` : "",
    "--------------------",
    `Tax Invoice: ${invoice.invoice_no}`,
    `Date: ${date(invoice.invoice_date)}`,
    `Buyer: ${invoice.customer_name}`,
    "--------------------",
    ...items.map((i, n) => `${n + 1}. ${i.product_name}${i.hsn_code ? ` (HSN ${i.hsn_code})` : ""} x ${i.quantity} @ ${money(i.rate)} = ${money(i.line_total)}`),
    "--------------------",
    `Taxable value: ${money(invoice.taxable_amount)}`,
  ];
  if (inter) lines.push(`IGST (${Number(invoice.igst_rate)}%): ${money(invoice.igst_amount)}`);
  else lines.push(`CGST (${Number(invoice.cgst_rate)}%): ${money(invoice.cgst_amount)}`, `SGST (${Number(invoice.sgst_rate)}%): ${money(invoice.sgst_amount)}`);
  lines.push(`TOTAL: ${money(invoice.grand_total)}`);
  if (Number(invoice.amount_paid) > 0) lines.push(`Paid: ${money(invoice.amount_paid)}`, `BALANCE DUE: ${money(invoice.balance_due)}`);
  return lines.filter((l) => l !== "").join("\n");
}
