import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  const user = session.user;

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    const recent = await sql`
      select 1
      from user_visits
      where user_id = ${user.id}::uuid
        and created_at > now() - interval '5 minutes'
      limit 1
    `;

    if (recent.length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await sql`
      insert into user_visits (user_id, user_agent)
      values (${user.id}::uuid, ${String((globalThis as any)?.navigator?.userAgent || "").slice(0, 500)})
    `;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
