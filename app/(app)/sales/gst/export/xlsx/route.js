import { buildGstReportXlsx } from "@/lib/gstExcel";
import { exportTotals, listFinalGstInvoices } from "@/lib/data/gstExport";
import { rejectIfNotOwner } from "@/lib/routeAuth";
import { streamBytes } from "@/lib/streamResponse";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Monthly GST report for the CA (finalized invoices only). Streamed so it never hits Vercel's 4.5MB response cap.
export async function GET(request) {
  const supabase = await createClient();
  const denied = await rejectIfNotOwner(supabase);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const range = { from: searchParams.get("from") ?? "", to: searchParams.get("to") ?? "" };
  const { rows, error } = await listFinalGstInvoices(supabase, range);
  if (error) return NextResponse.json({ error: "Could not load invoices." }, { status: 500 });
  if (rows.length === 0) return NextResponse.json({ error: "No finalized invoices in that date range." }, { status: 404 });

  const bytes = await buildGstReportXlsx(rows, exportTotals(rows));
  const label = `${range.from || "start"}_to_${range.to || "end"}`;
  return streamBytes(new Uint8Array(bytes), {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `GST_Report_${label}.xlsx`,
  });
}
