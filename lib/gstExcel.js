import writeExcelFile from "write-excel-file/node";

const dmy = (iso) => String(iso ?? "").slice(0, 10).split("-").reverse().join("-");
const HEAD = ["Date", "Invoice No", "Customer Name", "Customer GSTIN", "Taxable Value", "CGST Amount", "SGST Amount", "IGST Amount", "Total Invoice Value"];
const MONEY = "#,##0.00";

// The monthly GST report for the CA: same nine columns and TOTAL row as the reference workbook.
export async function buildGstReportXlsx(rows, totals) {
  const money = (value, bold) => ({ value: Number(value), type: Number, format: MONEY, fontWeight: bold ? "bold" : undefined, align: "right" });
  const head = HEAD.map((h, i) => ({ value: h, fontWeight: "bold", backgroundColor: "#111827", textColor: "#ffffff", align: i >= 4 ? "right" : "left" }));
  const body = rows.map((r) => [
    { value: dmy(r.invoice_date) },
    { value: String(r.invoice_no) },
    { value: r.customer_name ?? "" },
    { value: r.customer_gstin ?? "" },
    money(r.taxable_amount),
    money(r.cgst_amount),
    money(r.sgst_amount),
    money(r.igst_amount),
    money(r.grand_total),
  ]);
  const total = [
    { value: "" },
    { value: "" },
    { value: "TOTAL", fontWeight: "bold" },
    { value: "" },
    money(totals.taxable, true),
    money(totals.cgst, true),
    money(totals.sgst, true),
    money(totals.igst, true),
    money(totals.total, true),
  ];
  const columns = [{ width: 12 }, { width: 12 }, { width: 32 }, { width: 18 }, { width: 15 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 }];
  const sheet = [{ data: [head, ...body, total], sheet: "GST Report", columns }];
  return writeExcelFile(sheet).toBuffer();
}
