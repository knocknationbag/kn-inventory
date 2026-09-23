import { NextResponse } from "next/server";

// For route handlers: returns a 401 response unless the signed-in user is the shop owner, otherwise null.
export async function rejectIfNotOwner(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isOwner } = user ? await supabase.rpc("is_owner") : { data: false };
  return isOwner ? null : NextResponse.json({ error: "Not signed in." }, { status: 401 });
}
