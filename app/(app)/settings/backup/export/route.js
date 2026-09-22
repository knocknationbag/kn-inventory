import { NextResponse } from "next/server";
import { todayISO } from "@/lib/format";
import { buildFullBackup } from "@/lib/reports/backup";
import { streamText } from "@/lib/streamResponse";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Streamed rather than buffered so a shop with years of history never hits Vercel's 4.5MB
// buffered-response limit — streamed responses are exempt from that cap.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isOwner } = user ? await supabase.rpc("is_owner") : { data: false };
  if (!isOwner) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const data = await buildFullBackup(supabase);
  const body = JSON.stringify({ kind: "kn-inventory-billing-backup", generated_on: todayISO(), data }, null, 2);
  return streamText(body, { contentType: "application/json; charset=utf-8", filename: `kn-billing-full-backup-${todayISO()}.json` });
}
