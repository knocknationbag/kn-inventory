import { NextResponse } from "next/server";
import { todayISO } from "@/lib/format";
import { buildFullBackup } from "@/lib/reports/backup";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isOwner } = user ? await supabase.rpc("is_owner") : { data: false };
  if (!isOwner) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const data = await buildFullBackup(supabase);
  const body = JSON.stringify({ kind: "kn-inventory-billing-backup", generated_on: todayISO(), data }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="kn-billing-full-backup-${todayISO()}.json"`,
    },
  });
}
