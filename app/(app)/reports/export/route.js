import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { todayISO } from "@/lib/format";
import { EXPORTS } from "@/lib/reports/exports";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FILTER_KEYS = ["from", "to", "q", "kind", "category", "supplier", "filter"];

// Downloads a report as CSV (opens in Excel/Sheets) or JSON. Only the signed-in owner can read any data.
export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isOwner } = user ? await supabase.rpc("is_owner") : { data: false };
  if (!isOwner) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const definition = EXPORTS[searchParams.get("report")];
  if (!definition) return NextResponse.json({ error: "Unknown report." }, { status: 400 });

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? ""]));
  const rows = await definition.load(supabase, filters);
  const stamp = todayISO();
  const format = searchParams.get("format") === "json" ? "json" : "csv";
  const headers = { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${definition.filename}-${stamp}.${format}"` };

  if (format === "json") {
    const body = JSON.stringify({ report: definition.filename, generated_on: stamp, filters, rows }, null, 2);
    return new Response(body, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
  }
  // The leading BOM makes Excel read the file as UTF-8.
  return new Response(`﻿${toCsv(definition.columns, rows)}`, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
}
