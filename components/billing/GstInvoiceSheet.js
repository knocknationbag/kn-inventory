/* eslint-disable @next/next/no-img-element */
import { GST_DECLARATION, hasBankDetails } from "@/lib/gst";
import { formatCurrency, formatDate } from "@/lib/format";
import { amountInWords } from "@/lib/numberToWords";

const GOLD = "#d4af37";
const MIN_ROWS = 3;
const TAGLINE = "Mfg. School Bags, College Bags & Complimentary Items";

function Kv({ label, value, bold }) {
  return (
    <div className="flex gap-2 py-0.5 text-[11px] leading-snug sm:text-xs">
      <span className="w-[6.5rem] shrink-0 text-neutral-500 sm:w-32">{label}</span>
      <span className={`min-w-0 break-words ${bold ? "font-bold" : "font-medium"}`}>{value || " "}</span>
    </div>
  );
}

function Pair({ a, b }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {a}
      {b}
    </div>
  );
}

function TaxRow({ label, value, strong }) {
  return (
    <tr className={strong ? "bg-neutral-100 font-bold" : ""}>
      <td className="border border-neutral-400 px-2 py-1">{label}</td>
      <td className="whitespace-nowrap border border-neutral-400 px-2 py-1 text-right">{value}</td>
    </tr>
  );
}

const TH = "border border-neutral-900 px-1.5 py-1.5 font-semibold";
const TD = "border border-neutral-400 px-1.5 py-1.5";

// The printed / PDF GST Tax Invoice. Fixed paper colours (never theme tokens) so dark mode cannot leak into print.
export default function GstInvoiceSheet({ invoice, items, settings }) {
  const inter = invoice.tax_type === "inter";
  const draft = invoice.status === "draft";
  const cgst = Number(invoice.cgst_amount);
  const sgst = Number(invoice.sgst_amount);
  const igst = Number(invoice.igst_amount);
  const totalTax = cgst + sgst + igst;
  const paid = Number(invoice.amount_paid);
  const blankRows = Math.max(0, MIN_ROWS - items.length);

  return (
    <article
      id="invoice"
      className="mx-auto w-full max-w-[210mm] bg-white p-3 text-neutral-900 shadow-card ring-1 ring-black/5 sm:p-8 print:max-w-none print:p-0 print:shadow-none print:ring-0"
    >
      <header className="border-b-[3px] pb-3" style={{ borderColor: GOLD }}>
        <div className="flex items-start justify-between gap-2">
          <img src="/invoice/gst-bill-logo-left.jpeg" alt="" className="h-11 w-auto shrink-0 object-contain sm:h-16" />
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-lg font-extrabold uppercase tracking-wide sm:text-2xl">{settings.shop_name}</h1>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500 sm:text-[11px]">{TAGLINE}</p>
            <p className="mt-1 text-[10px] leading-snug text-neutral-600 sm:text-xs">{settings.address}</p>
            <p className="mt-0.5 text-[11px] sm:text-xs">
              {settings.email && <>Email: {settings.email}</>}
              {settings.email && settings.phones && <span className="mx-1.5 text-neutral-400">|</span>}
              {settings.phones && <>Mob.: {settings.phones}</>}
            </p>
            <p className="mt-0.5 text-[11px] sm:text-xs">
              {settings.pan && (
                <>
                  PAN No: <b>{settings.pan}</b>
                </>
              )}
              {settings.pan && settings.gst_number && <span className="mx-1.5 text-neutral-400">|</span>}
              {settings.gst_number && (
                <>
                  GSTIN: <b>{settings.gst_number}</b>
                </>
              )}
            </p>
          </div>
          <img src="/invoice/gst-bill-logo-right.jpeg" alt="" className="h-11 w-auto shrink-0 object-contain sm:h-16" />
        </div>
      </header>

      <h2 className="my-2 text-center text-base font-extrabold uppercase tracking-[0.2em] sm:text-lg">{draft ? "Draft invoice" : "Tax invoice"}</h2>
      {draft && <p className="mb-2 text-center text-[11px] font-semibold text-red-700">Draft. Not a valid tax invoice until it is finalized.</p>}

      <div className="grid gap-2 sm:grid-cols-2 print:grid-cols-2">
        <section className="rounded border border-neutral-400 p-2">
          <h3 className="mb-1 border-b border-neutral-300 pb-1 text-[11px] font-bold uppercase tracking-wide">Details of receiver / bill to</h3>
          <Kv label="Name" value={invoice.customer_name} bold />
          <Kv label="Address" value={invoice.customer_address} />
          <Kv label="GSTIN" value={invoice.customer_gstin || "Unregistered"} />
          <Pair a={<Kv label="State" value={invoice.customer_state} />} b={<Kv label="State code" value={invoice.customer_state_code} />} />
          <Kv label="Mob. no." value={invoice.customer_mobile} />
        </section>
        <section className="rounded border border-neutral-400 p-2">
          <h3 className="mb-1 border-b border-neutral-300 pb-1 text-[11px] font-bold uppercase tracking-wide">Invoice details</h3>
          <Kv label="Invoice no." value={invoice.invoice_no} bold />
          <Kv label="Invoice date" value={formatDate(invoice.invoice_date)} bold />
          <Kv label="Reverse charge" value={invoice.reverse_charge ? "Yes" : "No"} />
          <Pair a={<Kv label="State" value={invoice.supply_state} />} b={<Kv label="State code" value={invoice.supply_state_code} />} />
          <Kv label="Transport mode" value={invoice.transport_mode} />
          <Kv label="Vehicle no." value={invoice.vehicle_number} />
          <Kv label="Date of supply" value={invoice.date_of_supply ? formatDate(invoice.date_of_supply) : ""} />
          <Pair a={<Kv label="Place of supply" value={invoice.place_of_supply} />} b={<Kv label="State code" value={invoice.place_of_supply_state_code} />} />
        </section>
      </div>

      <div className="mt-3 overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[34rem] border-collapse text-[11px] sm:text-xs print:min-w-0">
          <thead>
            <tr className="bg-neutral-900 text-left text-white">
              <th className={`${TH} w-8`}>Sr.</th>
              <th className={TH}>Name of products</th>
              <th className={TH}>Item no.</th>
              <th className={TH}>HSN / ACS</th>
              <th className={TH}>UOM</th>
              <th className={`${TH} text-right`}>Qty</th>
              <th className={`${TH} text-right`}>Rate</th>
              <th className={`${TH} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="align-top">
                <td className={`${TD} text-neutral-500`}>{index + 1}</td>
                <td className={TD}>{item.product_name}</td>
                <td className={TD}>{item.item_no}</td>
                <td className={TD}>{item.hsn_code}</td>
                <td className={TD}>{item.uom}</td>
                <td className={`${TD} text-right`}>{item.quantity}</td>
                <td className={`${TD} whitespace-nowrap text-right`}>{formatCurrency(item.rate)}</td>
                <td className={`${TD} whitespace-nowrap text-right font-semibold`}>{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
            {Array.from({ length: blankRows }, (_, i) => (
              <tr key={`blank-${i}`}>
                {Array.from({ length: 8 }, (_, c) => (
                  <td key={c} className="border border-neutral-400 px-1.5 py-2.5">
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto mt-3 w-full max-w-xs break-inside-avoid">
        <table className="w-full border-collapse text-[11px] sm:text-xs">
          <tbody>
            <TaxRow label="Total amount before tax" value={formatCurrency(invoice.taxable_amount)} />
            {inter ? (
              <TaxRow label={`IGST @ ${Number(invoice.igst_rate)}%`} value={formatCurrency(igst)} />
            ) : (
              <>
                <TaxRow label={`CGST @ ${Number(invoice.cgst_rate)}%`} value={formatCurrency(cgst)} />
                <TaxRow label={`SGST @ ${Number(invoice.sgst_rate)}%`} value={formatCurrency(sgst)} />
              </>
            )}
            <TaxRow label="Total tax amount" value={formatCurrency(totalTax)} />
            <TaxRow label="Total amount after tax" value={formatCurrency(invoice.grand_total)} strong />
            {paid > 0 && <TaxRow label="Amount paid" value={formatCurrency(paid)} />}
            {paid > 0 && <TaxRow label="Balance due" value={formatCurrency(invoice.balance_due)} strong />}
          </tbody>
        </table>
      </div>

      <p className="mt-3 rounded border border-neutral-400 p-2 text-[11px] sm:text-xs">
        <b>Total invoice amount in words: </b>
        {amountInWords(invoice.grand_total)}
      </p>

      {invoice.notes && (
        <p className="mt-2 whitespace-pre-wrap text-[11px] text-neutral-700 sm:text-xs">
          <b>Notes: </b>
          {invoice.notes}
        </p>
      )}

      <div className="mt-3 grid gap-2 break-inside-avoid sm:grid-cols-[3fr_2fr] print:grid-cols-[3fr_2fr]">
        <section className="rounded border border-neutral-400 p-2 text-[10px] leading-snug sm:text-[11px]">
          {hasBankDetails(settings) && (
            <div className="mb-2 border-b border-neutral-300 pb-2">
              <p className="mb-1 font-bold uppercase tracking-wide">Bank details</p>
              {settings.bank_name && (
                <p>
                  Bank Name : <b>{settings.bank_name}</b>
                </p>
              )}
              {settings.bank_account && (
                <p>
                  Bank Account Number : <b>{settings.bank_account}</b>
                </p>
              )}
              {settings.bank_ifsc && (
                <p>
                  Bank IFSC Code : <b>{settings.bank_ifsc}</b>
                </p>
              )}
              {settings.bank_branch && (
                <p>
                  Branch : <b>{settings.bank_branch}</b>
                </p>
              )}
            </div>
          )}
          <p>
            <b>Declaration: </b>
            {GST_DECLARATION}
          </p>
        </section>
        <section className="flex items-center rounded border border-neutral-400 p-2 text-center text-[11px] sm:text-xs">
          <p className="w-full">Certified that the particulars given above are true and correct.</p>
        </section>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 break-inside-avoid">
        <div className="flex h-24 items-end justify-center rounded border border-neutral-400 p-2 text-center text-[11px] font-semibold sm:text-xs">
          <span>
            Receiver&rsquo;s signature
            <br />
            with stamp
          </span>
        </div>
        <div className="relative flex h-24 flex-col items-center justify-end rounded border border-neutral-400 p-2 text-center text-[11px] sm:text-xs">
          <img src="/invoice/stamp.png" alt="" className="absolute left-1/2 top-1 size-14 -translate-x-1/2 object-contain" />
          <b>For {settings.shop_name}</b>
          <span className="font-semibold">Authorised signatory</span>
        </div>
      </div>
    </article>
  );
}
