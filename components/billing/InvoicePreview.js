/* eslint-disable @next/next/no-img-element */
import { formatCurrency, formatDate } from "@/lib/format";
import { amountInWords } from "@/lib/numberToWords";

const GOLD = "#d4af37";

function Line({ label, value, strong, danger }) {
  return (
    <div className={`flex justify-between gap-6 py-1 ${strong ? "mt-1 border-t border-neutral-800 pt-2 text-base font-bold" : "text-sm"}`}>
      <span className={strong ? "" : "text-neutral-600"}>{label}</span>
      <span className={`whitespace-nowrap ${strong ? "" : "font-medium"} ${danger ? "text-red-700" : ""}`}>{value}</span>
    </div>
  );
}

// The printed / PDF bill. Uses fixed paper colours (never theme tokens) so dark mode cannot leak into print.
export default function InvoicePreview({ sale, items, settings }) {
  const hasDates = items.some((i) => i.line_date);
  const discount = Number(sale.discount_amount);
  const gst = Number(sale.gst_amount);
  const previous = Number(sale.previous_due);
  const change = Number(sale.change_amount);

  return (
    <article
      id="invoice"
      className="mx-auto w-full max-w-[210mm] bg-white p-4 text-neutral-900 shadow-card ring-1 ring-black/5 sm:p-10 print:max-w-none print:p-0 print:shadow-none print:ring-0"
    >
      <header className="relative border-b-[3px] pb-4 text-center" style={{ borderColor: GOLD }}>
        <img src="/invoice/logo.png" alt="" className="absolute left-0 top-0 size-14 object-contain sm:size-20" />
        <div className="px-16 sm:px-24">
          <h1 className="text-xl font-extrabold uppercase tracking-wide sm:text-3xl">{settings.shop_name}</h1>
          {settings.phones && <p className="mt-1 text-sm font-semibold sm:text-lg">{settings.phones}</p>}
          <p className="mt-1 text-[11px] leading-snug text-neutral-600 sm:text-sm">{settings.address}</p>
          {settings.gst_number && <p className="mt-1 text-xs font-semibold sm:text-sm">GSTIN: {settings.gst_number}</p>}
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3 text-sm sm:text-base">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Billed to</p>
          <p className="text-base font-bold sm:text-lg">{sale.customer_name || "Walk-in customer"}</p>
        </div>
        <div className="text-right">
          <p>
            <span className="text-neutral-500">Bill no: </span>
            <b>{sale.invoice_no}</b>
          </p>
          <p>
            <span className="text-neutral-500">Date: </span>
            <b>{formatDate(sale.sale_date)}</b>
          </p>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-neutral-900 text-left text-white">
            <th className="w-8 px-2 py-2 font-semibold">#</th>
            {hasDates && <th className="hidden px-2 py-2 font-semibold sm:table-cell">Date</th>}
            <th className="px-2 py-2 font-semibold">Item</th>
            <th className="px-2 py-2 text-right font-semibold">Qty</th>
            <th className="px-2 py-2 text-right font-semibold">Rate</th>
            <th className="px-2 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-b border-neutral-200 align-top">
              <td className="px-2 py-2 text-neutral-500">{index + 1}</td>
              {hasDates && <td className="hidden whitespace-nowrap px-2 py-2 sm:table-cell">{item.line_date ? formatDate(item.line_date) : ""}</td>}
              <td className="px-2 py-2">
                {item.description}
                {item.line_date && <span className="block text-[11px] text-neutral-500 sm:hidden">{formatDate(item.line_date)}</span>}
              </td>
              <td className="px-2 py-2 text-right">{item.quantity}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right">{formatCurrency(item.rate)}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right font-semibold">{formatCurrency(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 ml-auto w-full max-w-xs break-inside-avoid">
        <Line label="Subtotal" value={formatCurrency(sale.subtotal)} />
        {discount > 0 && <Line label={`Discount (${Number(sale.discount_rate)}%)`} value={`- ${formatCurrency(discount)}`} />}
        {gst > 0 && <Line label={`GST (${Number(sale.gst_rate)}%)`} value={formatCurrency(gst)} />}
        <Line label="Grand total" value={formatCurrency(sale.grand_total)} strong />
        {previous > 0 && <Line label="Previous due" value={formatCurrency(previous)} />}
        {previous > 0 && <Line label="Total payable" value={formatCurrency(sale.total_payable)} />}
        <Line label="Paid" value={formatCurrency(sale.amount_paid)} />
        <Line label="Balance due" value={formatCurrency(sale.balance_due)} strong danger={Number(sale.balance_due) > 0} />
        {change > 0 && <Line label="Change" value={formatCurrency(change)} />}
      </div>

      <p className="mt-5 rounded border border-neutral-300 p-3 text-xs sm:text-sm">
        <b>Amount in words: </b>
        {amountInWords(sale.grand_total)}
      </p>

      {sale.notes && (
        <p className="mt-3 whitespace-pre-wrap text-xs text-neutral-700 sm:text-sm">
          <b>Notes: </b>
          {sale.notes}
        </p>
      )}

      <footer className="mt-10 flex items-end justify-between gap-4 break-inside-avoid">
        <p className="text-sm text-neutral-600">Thank you for your purchase!</p>
        <div className="flex flex-col items-center">
          <img src="/invoice/stamp.png" alt="" className="size-20 object-contain sm:size-24" />
          <p className="text-xs font-semibold">Authorized Signature</p>
        </div>
      </footer>
    </article>
  );
}
