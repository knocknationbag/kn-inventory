import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { todayISO } from "@/lib/format";
import { EXPORTS } from "@/lib/reports/exports";
import { streamText } from "@/lib/streamResponse";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FILTER_KEYS = ["from", "to", "q", "kind", "category", "supplier", "filter", "date"];

// Downloads a report as CSV (opens in Excel/Sheets) or JSON. Only the signed-in owner can read any data.
// Streamed rather than buffered so a large export never hits Vercel's 4.5MB buffered-response limit.
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

  if (format === "json") {
    const body = JSON.stringify({ report: definition.filename, generated_on: stamp, filters, rows }, null, 2);
    return streamText(body, { contentType: "application/json; charset=utf-8", filename: `${definition.filename}-${stamp}.json` });
  }
  // The leading BOM makes Excel read the file as UTF-8.
  return streamText(`﻿${toCsv(definition.columns, rows)}`, { contentType: "text/csv; charset=utf-8", filename: `${definition.filename}-${stamp}.csv` });
}
