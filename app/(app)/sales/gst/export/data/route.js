import { NextResponse } from "next/server";
import { getFinalGstInvoicesWithItems } from "@/lib/data/gstExport";
import { rejectIfNotOwner } from "@/lib/routeAuth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Every finalized invoice in the range with its lines; the browser builds the consolidated PDF from this.
export async function GET(request) {
  const supabase = await createClient();
  const denied = await rejectIfNotOwner(supabase);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const { invoices, error } = await getFinalGstInvoicesWithItems(supabase, { from: searchParams.get("from") ?? "", to: searchParams.get("to") ?? "" });
  if (error) return NextResponse.json({ error: "Could not load invoices." }, { status: 500 });
  if (invoices.length > 500) return NextResponse.json({ error: "Too many invoices for one PDF. Choose a shorter date range." }, { status: 400 });
  return NextResponse.json({ invoices }, { headers: { "Cache-Control": "no-store" } });
}
