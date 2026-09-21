// Bill maths shared by the form, the invoice and the PDF. The database repeats the same
// steps in save_sale(): discount first, then GST on what remains, each rounded to the paisa.
// Everything is done in whole paise (integers) so browser and database always agree exactly.

const paise = (n) => Math.round((Number(n) || 0) * 100);
const basisPoints = (percent) => Math.round((Number(percent) || 0) * 100);
// Rounds half up for non-negative values, which matches Postgres numeric rounding.
const divRound = (numerator, denominator) => Math.floor((numerator * 2 + denominator) / (denominator * 2));
const rupees = (p) => p / 100;

export const lineTotal = (quantity, rate) => rupees((Math.trunc(Number(quantity)) || 0) * paise(rate));

export function computeTotals({ lines, discountRate = 0, gstRate = 0, previousDue = 0, paid = 0 }) {
  const subtotal = lines.reduce((sum, l) => sum + (Math.trunc(Number(l.quantity)) || 0) * paise(l.rate), 0);
  const discount = divRound(subtotal * basisPoints(discountRate), 10000);
  const gst = divRound((subtotal - discount) * basisPoints(gstRate), 10000);
  const grand = subtotal - discount + gst;
  const previous = paise(previousDue);
  const payable = grand + previous;
  const paidAmount = paise(paid);
  return {
    subtotal: rupees(subtotal),
    discount: rupees(discount),
    gst: rupees(gst),
    grand: rupees(grand),
    previous: rupees(previous),
    payable: rupees(payable),
    paid: rupees(paidAmount),
    balance: rupees(Math.max(payable - paidAmount, 0)),
    change: rupees(Math.max(paidAmount - payable, 0)),
  };
}

export function paymentStatus({ balance_due, amount_paid }) {
  if (Number(balance_due) > 0) return Number(amount_paid) > 0 ? "partial" : "due";
  return "paid";
}

// Plain-text version of a bill, used for "Copy" and the WhatsApp message.
export function billText({ sale, items, settings, money, date }) {
  const lines = [
    settings.shop_name,
    settings.phones,
    "--------------------",
    `Bill: ${sale.invoice_no}`,
    `Date: ${date(sale.sale_date)}`,
    `Customer: ${sale.customer_name || "Walk-in customer"}`,
    "--------------------",
    ...items.map((i, n) => `${n + 1}. ${i.description} x ${i.quantity} @ ${money(i.rate)} = ${money(i.line_total)}`),
    "--------------------",
    `Subtotal: ${money(sale.subtotal)}`,
  ];
  if (Number(sale.discount_amount) > 0) lines.push(`Discount (${Number(sale.discount_rate)}%): -${money(sale.discount_amount)}`);
  if (Number(sale.gst_amount) > 0) lines.push(`GST (${Number(sale.gst_rate)}%): ${money(sale.gst_amount)}`);
  lines.push(`GRAND TOTAL: ${money(sale.grand_total)}`);
  if (Number(sale.previous_due) > 0) {
    lines.push(`Previous due: ${money(sale.previous_due)}`, `Total payable: ${money(sale.total_payable)}`);
  }
  lines.push(`Paid: ${money(sale.amount_paid)}`);
  lines.push(`BALANCE DUE: ${money(sale.balance_due)}`);
  if (Number(sale.change_amount) > 0) lines.push(`Change: ${money(sale.change_amount)}`);
  lines.push("Thank you for your purchase!");
  return lines.join("\n");
}
